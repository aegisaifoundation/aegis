import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import crypto from 'crypto';
import { workspaceManager } from './WorkspaceManager.js';
import { safeJsonRead, safeJsonWrite } from '../memory/utils/MemoryFileHelpers.js';
import { eventBus } from '../events/EventBus.js';
import { EventTypes } from '../events/EventTypes.js';
import { RuntimeLockState, BootMode, RuntimeHealthStatus, RuntimeMode } from '../memory/interfaces/MemoryTypes.js';
import { RuntimeSupervisorHooks } from './RuntimeSupervisorHooks.js';

export interface RuntimeStateData {
  runtimeId: string;
  runtimeClusterId: string;
  runtimeEpoch: number;
  activeSessionId: string;
  mountedSessionId: string;
  runtimeState: 'ACTIVE' | 'INACTIVE';
  bootMode: BootMode;
  lastBootAt: string;
  lastShutdownAt: string;
  runtimeVersion: string;
  lastSessionSwitchAt: string;
  recoveryRequired: boolean;
  recoveryReason: string;
  recoveryAttempts: number;
  runtimeLockState: RuntimeLockState;
  mountGeneration: number;
  mountToken: string;
  lastShutdownClean: boolean;
  lastHeartbeatAt: string;
  checkoutStage?: string;
  activeCapabilities: {
    tools: string[];
    plugins: string[];
    providers: string[];
    workflows: string[];
  };
  runtimeHealthStatus: RuntimeHealthStatus;
  runtimeContextVersion: string;
  lastRecoveryCheckpoint?: string;
  runtimeMode: RuntimeMode;
  lastMountIntent?: string;
  mountLease?: {
    ownerRuntimeId: string;
    acquiredAt: string;
    expiresAt: string;
  };
}

export class RuntimeStateManager {
  private static instance = new RuntimeStateManager();
  private cache: RuntimeStateData | null = null;

  public static getInstance(): RuntimeStateManager {
    return this.instance;
  }

  private getStateFilePath(): string {
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    return path.resolve(wsRoot, 'runtime/runtime-state.json');
  }

  /**
   * Loads state from runtime-state.json. Falls back to default state on failure or missing file.
   */
  public async loadState(): Promise<RuntimeStateData> {
    if (this.cache) return this.cache;
    const filePath = this.getStateFilePath();
    const defaultState = this.generateDefaultState();
    
    try {
      const data = await safeJsonRead<RuntimeStateData | null>(filePath, null);
      if (data) {
        this.cache = data;
        eventBus.emit(EventTypes.RUNTIME_STATE_LOADED, { runtimeId: data.runtimeId }, 'runtime-state');
        return data;
      }
    } catch (err) {
      console.error('[RuntimeStateManager] Failed to read state, recovering...', err);
      await this.recoverRuntimeState();
    }

    this.cache = defaultState;
    await this.saveState(defaultState);
    return defaultState;
  }

  /**
   * Saves runtime state atomically.
   */
  public async saveState(state: RuntimeStateData): Promise<void> {
    this.cache = state;
    const filePath = this.getStateFilePath();
    await safeJsonWrite(filePath, state);
    eventBus.emit(EventTypes.RUNTIME_STATE_PERSISTED, { runtimeId: state.runtimeId }, 'runtime-state');
  }

  public async updateActiveSession(sessionId: string): Promise<void> {
    const state = await this.loadState();
    state.activeSessionId = sessionId;
    state.lastSessionSwitchAt = new Date().toISOString();
    await this.saveState(state);
  }

  public async updateMountedSession(sessionId: string): Promise<void> {
    const state = await this.loadState();
    state.mountedSessionId = sessionId;
    await this.saveState(state);
  }

  /**
   * Marks startup. Emits crash detection if the last run did not exit cleanly.
   */
  public async markStartup(): Promise<void> {
    const state = await this.loadState();
    
    if (state.lastShutdownClean === false) {
      state.bootMode = BootMode.RECOVERY_MODE;
      state.runtimeHealthStatus = RuntimeHealthStatus.RECOVERING;
      state.recoveryRequired = true;
      state.recoveryReason = 'UNCLEAN_SHUTDOWN';
      state.recoveryAttempts += 1;
      eventBus.emit(EventTypes.RUNTIME_CRASH_DETECTED, { runtimeId: state.runtimeId }, 'runtime-state');
      await RuntimeSupervisorHooks.onRuntimeDegraded('Unclean shutdown detected, entering RECOVERY_MODE.');
    } else {
      state.lastShutdownClean = false; // set to false; marked clean only on shutdown
    }

    state.lastBootAt = new Date().toISOString();
    state.lastHeartbeatAt = new Date().toISOString();
    await this.saveState(state);
  }

  /**
   * Marks clean exit on shutdown.
   */
  public async markShutdown(): Promise<void> {
    const state = await this.loadState();
    state.lastShutdownClean = true;
    state.lastShutdownAt = new Date().toISOString();
    await this.saveState(state);
  }

  public async lockRuntime(lockState: RuntimeLockState): Promise<void> {
    const state = await this.loadState();
    state.runtimeLockState = lockState;
    await this.saveState(state);
    eventBus.emit(EventTypes.RUNTIME_LOCK_ACQUIRED, { lockState }, 'runtime-state');
  }

  public async unlockRuntime(): Promise<void> {
    const state = await this.loadState();
    state.runtimeLockState = RuntimeLockState.IDLE;
    await this.saveState(state);
    eventBus.emit(EventTypes.RUNTIME_LOCK_RELEASED, {}, 'runtime-state');
  }

  public async isRuntimeLocked(): Promise<boolean> {
    const state = await this.loadState();
    return state.runtimeLockState !== RuntimeLockState.IDLE;
  }

  public async validateRuntimeState(): Promise<boolean> {
    const filePath = this.getStateFilePath();
    if (!existsSync(filePath)) return false;
    try {
      const data = await safeJsonRead<RuntimeStateData | null>(filePath, null);
      return !!(data && typeof data.runtimeId === 'string' && typeof data.runtimeEpoch === 'number');
    } catch {
      return false;
    }
  }

  public async recoverRuntimeState(): Promise<void> {
    const defaultState = this.generateDefaultState();
    defaultState.bootMode = BootMode.RECOVERY_MODE;
    defaultState.recoveryRequired = true;
    defaultState.recoveryReason = 'CORRUPTED_STATE';
    await this.saveState(defaultState);
    await RuntimeSupervisorHooks.writeTrace('RUNTIME_STATE_RECOVERED', { runtimeId: defaultState.runtimeId });
  }

  /**
   * Saves a rollback point-in-time state checkpoint under workspace/runtime/checkpoints/.
   */
  public async createCheckpoint(name: string): Promise<void> {
    const state = await this.loadState();
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    const cpDir = path.resolve(wsRoot, 'runtime/checkpoints');
    if (!existsSync(cpDir)) {
      await fs.mkdir(cpDir, { recursive: true });
    }
    const cpPath = path.join(cpDir, `${name}.json`);
    await safeJsonWrite(cpPath, state);
    state.lastRecoveryCheckpoint = cpPath;
    await this.saveState(state);
    eventBus.emit(EventTypes.RUNTIME_RECOVERY_CHECKPOINT_CREATED, { checkpoint: cpPath }, 'runtime-state');
    await RuntimeSupervisorHooks.writeTrace('CHECKPOINT_CREATED', { name });
  }

  /**
   * Restores runtime state parameters from a checkpoint file.
   */
  public async rollbackToCheckpoint(name: string): Promise<void> {
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    const cpPath = path.resolve(wsRoot, `runtime/checkpoints/${name}.json`);
    if (!existsSync(cpPath)) {
      throw new Error(`Checkpoint ${name} not found.`);
    }
    const state = await safeJsonRead<RuntimeStateData>(cpPath, this.generateDefaultState());
    state.runtimeEpoch += 1; // Increment epoch on forced reset
    await this.saveState(state);
    eventBus.emit(EventTypes.RUNTIME_RECOVERY_CHECKPOINT_RESTORED, { checkpoint: cpPath }, 'runtime-state');
    await RuntimeSupervisorHooks.writeTrace('CHECKPOINT_RESTORED', { name });
  }

  private generateDefaultState(): RuntimeStateData {
    return {
      runtimeId: crypto.randomUUID(),
      runtimeClusterId: 'cluster-default',
      runtimeEpoch: 1,
      activeSessionId: '',
      mountedSessionId: '',
      runtimeState: 'ACTIVE',
      bootMode: BootMode.RESTORE_PREVIOUS,
      lastBootAt: new Date().toISOString(),
      lastShutdownAt: '',
      runtimeVersion: '1.0.0',
      lastSessionSwitchAt: '',
      recoveryRequired: false,
      recoveryReason: '',
      recoveryAttempts: 0,
      runtimeLockState: RuntimeLockState.IDLE,
      mountGeneration: 0,
      mountToken: crypto.randomUUID(),
      lastShutdownClean: true,
      lastHeartbeatAt: new Date().toISOString(),
      activeCapabilities: {
        tools: [],
        plugins: [],
        providers: [],
        workflows: []
      },
      runtimeHealthStatus: RuntimeHealthStatus.HEALTHY,
      runtimeContextVersion: '1.0.0',
      runtimeMode: RuntimeMode.NORMAL
    };
  }
}

export const runtimeStateManager = RuntimeStateManager.getInstance();
