import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { workspaceManager } from './WorkspaceManager.js';
import { SessionMetadata, SessionLifecycleState } from '../memory/interfaces/MemoryTypes.js';
import { memoryManager } from '../memory/MemoryManager.js';
import { eventBus } from '../events/EventBus.js';
import { EventTypes } from '../events/EventTypes.js';

export class SessionRecoveryManager {
  /**
   * Quarantines a repeatedly failing or corrupted session to workspace/memory/quarantine/<session-id>/
   * and sets its lifecycle status to CORRUPTED.
   */
  public static async quarantineSession(sessionId: string, reason: string): Promise<void> {
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    const sourceDir = path.resolve(wsRoot, `memory/sessions/${sessionId}`);
    const quarantineDir = path.resolve(wsRoot, `memory/quarantine/${sessionId}`);

    if (!existsSync(sourceDir)) return;

    try {
      // 1. Attempt to load and update metadata
      let metadata: SessionMetadata;
      try {
        metadata = await memoryManager.getMetadata(sessionId, 'system');
      } catch {
        // Build fallback metadata if missing or unreadable
        metadata = {
          sessionId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastAccessedAt: new Date().toISOString(),
          memoryVersion: '1.0.0',
          lifecycleState: SessionLifecycleState.CORRUPTED,
          checksums: {},
          confidence: {},
          tags: ['quarantined'],
          quotas: {
            maxSessions: 100,
            maxHistorySize: 10 * 1024 * 1024,
            maxWorkingMemorySize: 1500,
            maxSessionMemorySize: 1000,
            maxSnapshots: 10
          }
        };
      }

      metadata.lifecycleState = SessionLifecycleState.CORRUPTED;
      metadata.quarantineReason = reason;
      metadata.quarantinedAt = new Date().toISOString();
      metadata.corruptionScore = 1.0; // mark fully corrupted

      const metadataPath = path.join(sourceDir, 'metadata.json');
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

      // 2. Make sure quarantine parent directory exists
      const parentDir = path.dirname(quarantineDir);
      if (!existsSync(parentDir)) {
        await fs.mkdir(parentDir, { recursive: true });
      }

      // Rename/move the directory
      await fs.rename(sourceDir, quarantineDir);
      
      // Clear active/mounted session in runtime state if it matches the quarantined session
      const { runtimeStateManager } = await import('./RuntimeStateManager.js');
      const state = await runtimeStateManager.loadState();
      if (state.mountedSessionId === sessionId || state.activeSessionId === sessionId) {
        state.mountedSessionId = '';
        state.activeSessionId = '';
        state.mountLease = undefined;
        await runtimeStateManager.saveState(state);
      }
      
      eventBus.emit(EventTypes.SESSION_QUARANTINED, { sessionId, reason }, 'recovery-manager');
      eventBus.emit(EventTypes.SESSION_QUARANTINE_REASON_UPDATED, { sessionId, reason }, 'recovery-manager');
    } catch (err) {
      console.error(`[SessionRecoveryManager] Failed to quarantine session ${sessionId}:`, err);
    }
  }

  /**
   * Recovers a session from snapshots. If it fails, quarantine the session.
   */
  public static async recoverFailedMount(sessionId: string): Promise<void> {
    console.warn(`[SessionRecoveryManager] Recovering failed mount for session ${sessionId}...`);
    eventBus.emit(EventTypes.SESSION_RECOVERY_STARTED, { sessionId }, 'recovery-manager');
    
    const success = await memoryManager.recoverCorruptedMemory(sessionId);
    if (!success) {
      await this.quarantineSession(sessionId, 'FAILED_RECOVERY');
      eventBus.emit(EventTypes.SESSION_RECOVERY_COMPLETED, { sessionId, success: false }, 'recovery-manager');
    } else {
      eventBus.emit(EventTypes.SESSION_RECOVERY_COMPLETED, { sessionId, success: true }, 'recovery-manager');
    }
  }

  public static async recoverInterruptedCheckout(sessionId: string): Promise<void> {
    await this.recoverFailedMount(sessionId);
  }

  public static async recoverCorruptedRuntimeState(): Promise<void> {
    // Delegates to state manager recovery
    const { runtimeStateManager } = await import('./RuntimeStateManager.js');
    await runtimeStateManager.recoverRuntimeState();
  }
}
