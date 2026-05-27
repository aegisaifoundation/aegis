import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { workspaceManager } from './WorkspaceManager.js';
import { runtimeStateManager } from './RuntimeStateManager.js';
import { sessionMountManager } from './SessionMountManager.js';
import { SessionRecoveryManager } from './SessionRecoveryManager.js';
import { SessionCompatibilityValidator } from './SessionCompatibilityValidator.js';
import { SessionStateTransitionValidator } from './SessionStateTransitionValidator.js';
import { memoryManager } from '../memory/MemoryManager.js';
import { memoryGateway } from '../memory/MemoryGateway.js';
import { MemoryIndexManager } from '../memory/indexing/MemoryIndexManager.js';
import { memoryTransactionManager } from '../memory/transactions/MemoryTransactionManager.js';
import { eventBus } from '../events/EventBus.js';
import { EventTypes } from '../events/EventTypes.js';
import { SessionLifecycleState, BootMode, RuntimeLockState, CheckoutStage, RuntimeHealthStatus, SessionState } from '../memory/interfaces/MemoryTypes.js';
import { RuntimeSupervisorHooks } from './RuntimeSupervisorHooks.js';
import { calculateChecksum } from '../memory/utils/MemoryFileHelpers.js';
import { Message } from '../types/Message.js';
import crypto from 'crypto';
import { checkpointManager } from './CheckpointManager.js';
import { runtimeHealthValidator } from './RuntimeHealthValidator.js';
import { sessionStateManager } from './SessionStateManager.js';
import { projectionGenerator } from '../memory/ProjectionGenerator.js';

export class RuntimeSessionManager {
  private static instance = new RuntimeSessionManager();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private watchdogInterval: NodeJS.Timeout | null = null;

  public static getInstance(): RuntimeSessionManager {
    return this.instance;
  }

  /**
   * Initializes the session orchestrator, checks boot modes, restores context, and starts watchdogs.
   */
  public async initialize(): Promise<void> {
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    const directories = [
      path.resolve(wsRoot, 'runtime'),
      path.resolve(wsRoot, 'runtime/checkpoints'),
      path.resolve(wsRoot, 'memory/trash'),
      path.resolve(wsRoot, 'memory/quarantine')
    ];
    for (const dir of directories) {
      if (!existsSync(dir)) {
        await fs.mkdir(dir, { recursive: true });
      }
    }

    // Startup markings
    await runtimeStateManager.markStartup();

    // 1. Run health validation on startup
    const health = await runtimeHealthValidator.validateHealth();
    if (!health.healthy) {
      console.warn(`[RuntimeSessionManager] Health checks failed on startup: ${health.errors.join('; ')}. Attempting recovery...`);
      await this.recoverRuntime();
    }

    const state = await runtimeStateManager.loadState();

    if (state.bootMode === BootMode.SAFE_MODE) {
      await RuntimeSupervisorHooks.onRuntimeSafeModeEntered('Booted in SAFE_MODE.');
      return; // SAFE_MODE restricts automatic context restoration
    }

    let activeId = state.activeSessionId;
    if (!activeId) {
      console.log('[RuntimeSessionManager] No active session ID found. Bootstrapping default context...');
      const defaultMeta = await this.createNewSession([], 'system');
      activeId = defaultMeta.sessionId;
    }

    try {
      await this.mountSession(activeId);
      eventBus.emit(EventTypes.SESSION_RESTORED, { sessionId: activeId, mounted: true }, 'session-continuity');
    } catch (err: any) {
      console.error(`[RuntimeSessionManager] Restoration failed on active session ${activeId}:`, err);
      await SessionRecoveryManager.recoverFailedMount(activeId);
    }

    // Start watchdogs
    this.startHeartbeat();
  }

  /**
   * Deterministically recovers the runtime from checkpoint, or resets to clean state.
   */
  public async recoverRuntime(): Promise<void> {
    console.log('[RuntimeSessionManager] Initiating runtime recovery...');
    const state = await runtimeStateManager.loadState();
    const activeId = state.activeSessionId || 'default';
    
    try {
      // Restore from checkpoint
      await checkpointManager.rollbackToCheckpoint('pre-mutation-checkpoint', activeId);
      console.log('[RuntimeSessionManager] Successfully recovered from checkpoint.');
    } catch (err: any) {
      console.error('[RuntimeSessionManager] Checkpoint rollback failed during recovery:', err.message);
      
      // Proactively clean up corrupted checkpoint files so they don't fail health check
      const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
      const cpDir = path.join(wsRoot, 'runtime/checkpoints');
      for (let i = 0; i < 5; i++) {
        try {
          await fs.rm(path.join(cpDir, `pre-mutation-checkpoint_runtime.json`), { force: true });
          await fs.rm(path.join(cpDir, `pre-mutation-checkpoint_session_${activeId}.json`), { force: true });
          break;
        } catch (rmErr) {
          await new Promise(resolve => setTimeout(resolve, 20));
        }
      }

      // Fallback: recover default state
      await runtimeStateManager.recoverRuntimeState();
      await sessionStateManager.initializeSessionState(activeId);
    }

    // Re-verify health after recovery
    const recheck = await runtimeHealthValidator.validateHealth();
    if (!recheck.healthy) {
      console.error('[RuntimeSessionManager] Recovery failed to stabilize the runtime core:', recheck.errors);
      throw new Error(`Critical Stabilization Failure: ${recheck.errors.join('; ')}`);
    }
  }

  /**
   * Cleans active leases and updates state flags on shutdown.
   */
  public async shutdown(): Promise<void> {
    this.stopHeartbeat();
    
    const state = await runtimeStateManager.loadState();
    
    // Checkpoint active state before shutdown
    if (state.mountedSessionId) {
      try {
        await checkpointManager.createCheckpoint('shutdown-checkpoint', state.mountedSessionId);
      } catch (err: any) {
        console.warn(`[RuntimeSessionManager] Shutdown checkpoint failed: ${err.message}`);
      }
    }

    // Run health check before shutdown
    const health = await runtimeHealthValidator.validateHealth();
    if (!health.healthy) {
      console.warn('[RuntimeSessionManager] Runtime health degraded during shutdown checks:', health.errors);
    }

    if (state.mountedSessionId) {
      await sessionMountManager.unmount(state.mountedSessionId);
    }
    await runtimeStateManager.markShutdown();
  }

  // ==========================================
  // Session Swapping & Creation
  // ==========================================

  /**
   * Creates a fresh, clean session context within transaction lock hooks.
   */
  public async createNewSession(tags: string[] = [], actor: string = 'system'): Promise<any> {
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    const state = await runtimeStateManager.loadState();
    
    await runtimeStateManager.lockRuntime(RuntimeLockState.SWITCHING);
    state.checkoutStage = CheckoutStage.VALIDATING;
    await runtimeStateManager.saveState(state);

    const newSessionId = `session_${Date.now()}`;
    const txId = `tx_new_${newSessionId}`;
    memoryTransactionManager.beginTransaction(txId);

    try {
      state.checkoutStage = CheckoutStage.PERSISTING_CURRENT;
      await runtimeStateManager.saveState(state);
      
      // Save current working memory if active
      if (state.mountedSessionId) {
        const working = await memoryGateway.getWorkingMemory(state.mountedSessionId, actor);
        const workingFile = path.resolve(wsRoot, `memory/sessions/${state.mountedSessionId}/working-memory.md`);
        await memoryTransactionManager.registerWrite(txId, workingFile, working);
      }

      state.checkoutStage = CheckoutStage.UNMOUNTING;
      await runtimeStateManager.saveState(state);
      if (state.mountedSessionId) {
        const currentMetaFile = path.resolve(wsRoot, `memory/sessions/${state.mountedSessionId}/metadata.json`);
        const meta = await memoryGateway.loadSession(state.mountedSessionId, actor);
        meta.lifecycleState = SessionLifecycleState.INACTIVE;
        await memoryTransactionManager.registerWrite(txId, currentMetaFile, JSON.stringify(meta, null, 2));
      }

      state.checkoutStage = CheckoutStage.RESTORING_TARGET;
      await runtimeStateManager.saveState(state);

      const sessionDir = path.resolve(wsRoot, `memory/sessions/${newSessionId}`);
      await fs.mkdir(sessionDir, { recursive: true });

      const newMetaFile = path.join(sessionDir, 'metadata.json');
      const newHistoryFile = path.join(sessionDir, 'history.json');
      const newSessionMemFile = path.join(sessionDir, 'session-memory.md');
      const newWorkingMemFile = path.join(sessionDir, 'working-memory.md');

      const metaContent = {
        sessionId: newSessionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastAccessedAt: new Date().toISOString(),
        memoryVersion: '1.0.0',
        lifecycleState: SessionLifecycleState.ACTIVE,
        checksums: {},
        confidence: {},
        tags,
        quotas: {
          maxSessions: 100,
          maxHistorySize: 10 * 1024 * 1024,
          maxWorkingMemorySize: 1500,
          maxSessionMemorySize: 1000,
          maxSnapshots: 10
        }
      };

      const defaultState: SessionState = {
        sessionId: newSessionId,
        status: 'ACTIVE',
        currentObjective: '',
        activeTasks: [],
        lastUpdatedAt: new Date().toISOString(),
        checkpointVersion: 0,
        temporaryExecutionContext: {},
        preferences: {},
        stableFacts: []
      };

      const workingProj = projectionGenerator.generateWorkingMemoryProjection(defaultState);
      const sessionProj = projectionGenerator.generateSessionMemoryProjection(defaultState);

      await memoryTransactionManager.registerWrite(txId, newMetaFile, JSON.stringify(metaContent, null, 2));
      await memoryTransactionManager.registerWrite(txId, newHistoryFile, JSON.stringify({ messages: [], memoryVersion: '1.0.0' }, null, 2));
      await memoryTransactionManager.registerWrite(txId, path.join(sessionDir, 'session-state.json'), JSON.stringify(defaultState, null, 2));
      await memoryTransactionManager.registerWrite(txId, newSessionMemFile, sessionProj);
      await memoryTransactionManager.registerWrite(txId, newWorkingMemFile, workingProj);

      state.checkoutStage = CheckoutStage.MOUNTING;
      await runtimeStateManager.saveState(state);

      state.activeSessionId = newSessionId;
      state.mountedSessionId = newSessionId;
      state.mountGeneration += 1;
      state.mountToken = crypto.randomUUID();
      state.lastSessionSwitchAt = new Date().toISOString();
      state.checkoutStage = CheckoutStage.FINALIZING;

      const stateFile = path.resolve(wsRoot, 'runtime/runtime-state.json');
      await memoryTransactionManager.registerWrite(txId, stateFile, JSON.stringify(state, null, 2));

      // Commit changes
      await memoryTransactionManager.commitTransaction(txId);
      
      // Update memory index registry list
      await MemoryIndexManager.registerSession(metaContent);
      await memoryManager.initialize();
      
      eventBus.emit(EventTypes.SESSION_CREATED, { sessionId: newSessionId, tags, actor }, 'session-continuity');
      eventBus.emit(EventTypes.SESSION_MOUNTED, { sessionId: newSessionId, mountToken: state.mountToken }, 'session-continuity');
      
      return metaContent;
    } catch (err) {
      state.checkoutStage = CheckoutStage.ROLLING_BACK;
      await runtimeStateManager.saveState(state);
      await memoryTransactionManager.rollbackTransaction(txId);
      throw err;
    } finally {
      await runtimeStateManager.unlockRuntime();
    }
  }

  /**
   * Switches runtime execution focus to another session.
   * Leverages transaction rolls to guarantee atomic file swaps.
   */
  public async checkoutSession(sessionId: string, actor: string = 'system'): Promise<void> {
    // 1. Run health validation before session switch
    const health = await runtimeHealthValidator.validateHealth();
    if (!health.healthy) {
      throw new Error(`Cannot checkout session: Runtime health is degraded: ${health.errors.join('; ')}`);
    }

    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    const state = await runtimeStateManager.loadState();

    // 2. Checkpoint active state before switching
    if (state.mountedSessionId) {
      try {
        await checkpointManager.createCheckpoint('pre-switch-checkpoint', state.mountedSessionId);
      } catch (err: any) {
        console.warn(`[RuntimeSessionManager] Pre-switch checkpoint failed: ${err.message}`);
      }
    }
    
    await runtimeStateManager.lockRuntime(RuntimeLockState.SWITCHING);
    state.checkoutStage = CheckoutStage.VALIDATING;
    await runtimeStateManager.saveState(state);
    eventBus.emit(EventTypes.SESSION_CHECKOUT_STARTED, { sessionId, previousSessionId: state.mountedSessionId }, 'session-continuity');

    // Confirm session exists
    const targetMetaPath = path.resolve(wsRoot, `memory/sessions/${sessionId}/metadata.json`);
    if (!existsSync(targetMetaPath)) {
      await runtimeStateManager.unlockRuntime();
      throw new Error(`Checkout failed: Session ${sessionId} does not exist.`);
    }

    const txId = `tx_checkout_${sessionId}`;
    memoryTransactionManager.beginTransaction(txId);

    try {
      state.checkoutStage = CheckoutStage.PERSISTING_CURRENT;
      await runtimeStateManager.saveState(state);
      
      // Persist current working memory
      if (state.mountedSessionId) {
        const working = await memoryGateway.getWorkingMemory(state.mountedSessionId, actor);
        const workingFile = path.resolve(wsRoot, `memory/sessions/${state.mountedSessionId}/working-memory.md`);
        await memoryTransactionManager.registerWrite(txId, workingFile, working);
      }

      state.checkoutStage = CheckoutStage.UNMOUNTING;
      await runtimeStateManager.saveState(state);
      if (state.mountedSessionId) {
        const currentMetaFile = path.resolve(wsRoot, `memory/sessions/${state.mountedSessionId}/metadata.json`);
        const meta = await memoryGateway.loadSession(state.mountedSessionId, actor);
        meta.lifecycleState = SessionLifecycleState.INACTIVE;
        await memoryTransactionManager.registerWrite(txId, currentMetaFile, JSON.stringify(meta, null, 2));
      }

      state.checkoutStage = CheckoutStage.RESTORING_TARGET;
      await runtimeStateManager.saveState(state);

      // Compatibility validation
      const targetMeta = await memoryGateway.loadSession(sessionId, actor);
      const compatibility = SessionCompatibilityValidator.validate(targetMeta);
      if (!compatibility.compatible) {
        throw new Error(`Incompatible session: ${compatibility.reason}`);
      }

      state.checkoutStage = CheckoutStage.MOUNTING;
      await runtimeStateManager.saveState(state);

      // Mount target
      targetMeta.lifecycleState = SessionLifecycleState.ACTIVE;
      targetMeta.lastMountedAt = new Date().toISOString();
      targetMeta.lastAccessedAt = new Date().toISOString();
      await memoryTransactionManager.registerWrite(txId, targetMetaPath, JSON.stringify(targetMeta, null, 2));

      state.activeSessionId = sessionId;
      state.mountedSessionId = sessionId;
      state.mountGeneration += 1;
      state.mountToken = crypto.randomUUID();
      state.lastSessionSwitchAt = new Date().toISOString();
      state.checkoutStage = CheckoutStage.FINALIZING;

      const stateFile = path.resolve(wsRoot, 'runtime/runtime-state.json');
      await memoryTransactionManager.registerWrite(txId, stateFile, JSON.stringify(state, null, 2));

      await memoryTransactionManager.commitTransaction(txId);
      
      // Update index registry
      if (state.mountedSessionId) {
        const oldMeta = await memoryGateway.loadSession(state.mountedSessionId, actor).catch(() => null);
        if (oldMeta) {
          await MemoryIndexManager.registerSession(oldMeta);
        }
      }
      await MemoryIndexManager.registerSession(targetMeta);
      
      eventBus.emit(EventTypes.SESSION_CHECKOUT_COMPLETED, { sessionId, mountToken: state.mountToken }, 'session-continuity');
      eventBus.emit(EventTypes.RUNTIME_SESSION_CHANGED, { sessionId, previousSessionId: state.activeSessionId }, 'session-continuity');
    } catch (err) {
      state.checkoutStage = CheckoutStage.ROLLING_BACK;
      await runtimeStateManager.saveState(state);
      await memoryTransactionManager.rollbackTransaction(txId);
      throw err;
    } finally {
      await runtimeStateManager.unlockRuntime();
    }
  }

  /**
   * Forks target session. Clones Markdown files but leaves history logs empty to prevent bloat.
   */
  public async forkSession(sessionId: string, actor: string = 'system'): Promise<string> {
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    const sourceMeta = await memoryGateway.loadSession(sessionId, actor);
    
    const forkedSessionId = `session_fork_${Date.now()}`;
    const forkedDir = path.resolve(wsRoot, `memory/sessions/${forkedSessionId}`);
    await fs.mkdir(forkedDir, { recursive: true });

    const sourceWorkingFile = path.resolve(wsRoot, `memory/sessions/${sessionId}/working-memory.md`);
    const sourceSessionFile = path.resolve(wsRoot, `memory/sessions/${sessionId}/session-memory.md`);

    const workingContent = await fs.readFile(sourceWorkingFile, 'utf8');
    const sessionContent = await fs.readFile(sourceSessionFile, 'utf8');

    const sourceState = await memoryGateway.getSessionState(sessionId, actor);
    const forkedState: SessionState = {
      ...sourceState,
      sessionId: forkedSessionId,
      checkpointVersion: 0,
      lastUpdatedAt: new Date().toISOString()
    };

    await fs.writeFile(path.join(forkedDir, 'working-memory.md'), workingContent, 'utf8');
    await fs.writeFile(path.join(forkedDir, 'session-memory.md'), sessionContent, 'utf8');
    await fs.writeFile(path.join(forkedDir, 'history.json'), JSON.stringify({ messages: [], memoryVersion: '1.0.0' }, null, 2), 'utf8');
    await fs.writeFile(path.join(forkedDir, 'session-state.json'), JSON.stringify(forkedState, null, 2), 'utf8');

    const forkedMeta = {
      ...sourceMeta,
      sessionId: forkedSessionId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAccessedAt: new Date().toISOString(),
      lifecycleState: SessionLifecycleState.INACTIVE,
      forkedFrom: sessionId,
      parentSessionId: sessionId,
      forkReference: {
        sourceSessionId: sessionId,
        sourceHistoryRange: `0-${sourceMeta.updatedAt}`
      },
      childSessions: [],
      checksums: {
        history: calculateChecksum(JSON.stringify({ messages: [], memoryVersion: '1.0.0' }, null, 2)),
        sessionMemory: calculateChecksum(sessionContent),
        workingMemory: calculateChecksum(workingContent)
      }
    };

    await fs.writeFile(path.join(forkedDir, 'metadata.json'), JSON.stringify(forkedMeta, null, 2), 'utf8');
    
    await MemoryIndexManager.registerSession(forkedMeta);
    await memoryManager.initialize(); // registry index refresh

    eventBus.emit(EventTypes.SESSION_FORKED, { sessionId: forkedSessionId, parentSessionId: sessionId }, 'session-continuity');
    return forkedSessionId;
  }

  public async renameSession(sessionId: string, displayName: string, description: string, actor: string = 'system'): Promise<void> {
    const meta = await memoryGateway.loadSession(sessionId, actor);
    meta.displayName = displayName;
    meta.description = description;
    meta.updatedAt = new Date().toISOString();

    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    const metadataPath = path.resolve(wsRoot, `memory/sessions/${sessionId}/metadata.json`);
    await fs.writeFile(metadataPath, JSON.stringify(meta, null, 2), 'utf8');

    await MemoryIndexManager.registerSession(meta);
    eventBus.emit(EventTypes.SESSION_RENAMED, { sessionId, displayName }, 'session-continuity');
  }

  /**
   * Soft deletes a session by moving its directory to workspace/memory/trash/.
   */
  public async deleteSession(sessionId: string, actor: string = 'system'): Promise<void> {
    const state = await runtimeStateManager.loadState();
    if (state.mountedSessionId === sessionId) {
      throw new Error('Cannot delete currently mounted active session.');
    }

    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    let sourceDir = path.resolve(wsRoot, `memory/sessions/${sessionId}`);
    let exists = existsSync(sourceDir);
    
    if (!exists) {
      const quarDir = path.resolve(wsRoot, `memory/quarantine/${sessionId}`);
      if (existsSync(quarDir)) {
        sourceDir = quarDir;
        exists = true;
      }
    }

    if (!exists) {
      throw new Error(`Session ${sessionId} does not exist.`);
    }

    const trashDir = path.resolve(wsRoot, `memory/trash/${sessionId}`);
    const metadataPath = path.join(sourceDir, 'metadata.json');
    let meta: any = null;
    if (existsSync(metadataPath)) {
      try {
        meta = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
      } catch {}
    }

    if (meta) {
      meta.lifecycleState = SessionLifecycleState.DELETED;
      meta.deletedAt = new Date().toISOString();
      meta.deletedBy = actor;
      meta.deletionReason = 'User deleted session';
      await fs.writeFile(metadataPath, JSON.stringify(meta, null, 2), 'utf8');
    }

    // Create snapshot backup before moving (if in sessions directory so memoryManager can read it)
    if (sourceDir.includes('memory/sessions')) {
      await memoryManager.createSnapshot(sessionId, 'sessionMemory', actor).catch(() => {});
      await memoryManager.createSnapshot(sessionId, 'workingMemory', actor).catch(() => {});
    }

    // Clear destination if EEXIST
    if (existsSync(trashDir)) {
      await fs.rm(trashDir, { recursive: true, force: true }).catch(() => {});
    }

    await fs.rename(sourceDir, trashDir);
    
    eventBus.emit(EventTypes.SESSION_DELETED, { sessionId, actor }, 'session-continuity');
    await MemoryIndexManager.unregisterSession(sessionId);
  }

  /**
   * Restores a soft-deleted session from trash.
   */
  public async resumeSession(sessionId: string, actor: string = 'system'): Promise<void> {
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    const trashDir = path.resolve(wsRoot, `memory/trash/${sessionId}`);
    const targetDir = path.resolve(wsRoot, `memory/sessions/${sessionId}`);

    if (existsSync(trashDir)) {
      await fs.rename(trashDir, targetDir);
      const meta = await memoryGateway.loadSession(sessionId, actor);
      meta.lifecycleState = SessionLifecycleState.RESTORED;
      meta.updatedAt = new Date().toISOString();
      
      const metadataPath = path.join(targetDir, 'metadata.json');
      await fs.writeFile(metadataPath, JSON.stringify(meta, null, 2), 'utf8');
    } else if (existsSync(targetDir)) {
      const meta = await memoryGateway.loadSession(sessionId, actor);
      meta.lifecycleState = SessionLifecycleState.RESTORED;
      meta.updatedAt = new Date().toISOString();
      
      const metadataPath = path.join(targetDir, 'metadata.json');
      await fs.writeFile(metadataPath, JSON.stringify(meta, null, 2), 'utf8');
    } else {
      throw new Error(`Resume failed: Session ${sessionId} does not exist in trash or sessions directory.`);
    }

    await this.mountSession(sessionId);
  }

  public async archiveCurrentSession(actor: string = 'system'): Promise<void> {
    const state = await runtimeStateManager.loadState();
    if (state.mountedSessionId) {
      await memoryManager.archiveSession(state.mountedSessionId, actor);
    }
  }

  public async mountSession(sessionId: string): Promise<void> {
    await sessionMountManager.mount(sessionId);
  }

  public async unmountCurrentSession(): Promise<void> {
    const mounted = await sessionMountManager.getMountedSession();
    if (mounted) {
      await sessionMountManager.unmount(mounted);
    }
  }

  // ==========================================
  // Getter/Information APIs
  // ==========================================

  public async getActiveSession(): Promise<string | null> {
    const state = await runtimeStateManager.loadState();
    return state.activeSessionId || null;
  }

  public async listSessions(): Promise<any[]> {
    return await MemoryIndexManager.listSessions();
  }

  // ==========================================
  // Watchdog Timers
  // ==========================================

  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(async () => {
      try {
        const state = await runtimeStateManager.loadState();
        state.lastHeartbeatAt = new Date().toISOString();
        await runtimeStateManager.saveState(state);
        eventBus.emit(EventTypes.RUNTIME_HEARTBEAT_UPDATED, { timestamp: state.lastHeartbeatAt }, 'runtime-watchdog');
      } catch (err) {
        console.error('[RuntimeSessionManager] Heartbeat write failed:', err);
      }
    }, 10000); // Update heartbeat every 10 seconds

    this.watchdogInterval = setInterval(async () => {
      try {
        const state = await runtimeStateManager.loadState();
        const lastHb = new Date(state.lastHeartbeatAt).getTime();
        const delta = Date.now() - lastHb;
        if (delta > 30000) { // stale after 30 seconds
          eventBus.emit(EventTypes.RUNTIME_HEARTBEAT_STALE, { lastHeartbeat: state.lastHeartbeatAt }, 'runtime-watchdog');
          await RuntimeSupervisorHooks.onRuntimeDegraded('Heartbeat watchdog timeout.');
        }
      } catch (err) {
        console.error('[RuntimeSessionManager] Watchdog check failed:', err);
      }
    }, 15000); // Check status every 15 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    if (this.watchdogInterval) {
      clearInterval(this.watchdogInterval);
      this.watchdogInterval = null;
    }
  }
}

export const runtimeSessionManager = RuntimeSessionManager.getInstance();
