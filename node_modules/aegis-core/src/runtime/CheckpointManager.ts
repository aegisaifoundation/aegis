import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { workspaceManager } from './WorkspaceManager.js';
import { runtimeStateManager, RuntimeStateData } from './RuntimeStateManager.js';
import { memoryGateway } from '../memory/MemoryGateway.js';
import { projectionGenerator } from '../memory/ProjectionGenerator.js';
import { safeJsonRead, safeJsonWrite } from '../memory/utils/MemoryFileHelpers.js';
import { SessionState } from '../memory/interfaces/MemoryTypes.js';

export class CheckpointManager {
  private static instance = new CheckpointManager();

  public static getInstance(): CheckpointManager {
    return this.instance;
  }

  private getCheckpointsDir(): string {
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    return path.resolve(wsRoot, 'runtime/checkpoints');
  }

  /**
   * Checkpoints only runtime-state.json and session-state.json.
   * Markdown files are NOT checkpointed.
   */
  public async createCheckpoint(name: string, sessionId: string): Promise<void> {
    const cpDir = this.getCheckpointsDir();
    if (!existsSync(cpDir)) {
      await fs.mkdir(cpDir, { recursive: true });
    }

    // 1. Read states
    const runtimeState = await runtimeStateManager.loadState();
    
    let sessionState: SessionState | null = null;
    if (sessionId) {
      try {
        sessionState = await memoryGateway.getSessionState(sessionId);
      } catch (err) {
        console.warn(`[CheckpointManager] Could not load session state for checkpoint: ${err}`);
      }
    }

    // 2. Write checkpoint files
    const runtimeCpPath = path.join(cpDir, `${name}_runtime.json`);
    await safeJsonWrite(runtimeCpPath, runtimeState);

    if (sessionId && sessionState) {
      const sessionCpPath = path.join(cpDir, `${name}_session_${sessionId}.json`);
      await safeJsonWrite(sessionCpPath, sessionState);
    }
  }

  /**
   * Restores runtime-state.json and session-state.json from checkpoint, then regenerates projections.
   */
  public async rollbackToCheckpoint(name: string, sessionId: string): Promise<void> {
    const cpDir = this.getCheckpointsDir();
    const runtimeCpPath = path.join(cpDir, `${name}_runtime.json`);
    const sessionCpPath = path.join(cpDir, `${name}_session_${sessionId}.json`);

    if (!existsSync(runtimeCpPath)) {
      throw new Error(`Checkpoint runtime-state for "${name}" not found at ${runtimeCpPath}`);
    }

    // 1. Restore runtime state
    const runtimeState = await safeJsonRead<RuntimeStateData | null>(runtimeCpPath, null);
    if (!runtimeState) {
      throw new Error(`Checkpoint runtime-state for "${name}" is empty or corrupted`);
    }
    runtimeState.runtimeEpoch = (runtimeState.runtimeEpoch || 0) + 1; // Increment epoch on reset
    await runtimeStateManager.saveState(runtimeState);

    // 2. Restore session state
    if (sessionId && existsSync(sessionCpPath)) {
      const sessionState = await safeJsonRead<SessionState | null>(sessionCpPath, null);
      if (!sessionState) {
        throw new Error(`Checkpoint session-state for "${name}" is empty or corrupted`);
      }
      sessionState.checkpointVersion = (sessionState.checkpointVersion || 0) + 1;
      await memoryGateway.updateSessionState(sessionId, sessionState);
      
      // 3. Regenerate markdown projections from restored authoritative JSON state
      await projectionGenerator.projectSessionState(sessionId, sessionState);
    }
  }
}

export const checkpointManager = CheckpointManager.getInstance();
