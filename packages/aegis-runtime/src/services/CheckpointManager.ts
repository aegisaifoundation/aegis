import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { workspaceManager } from '../workspace/WorkspaceManager.js';

export interface ICheckpointable {
  createCheckpoint(name: string, sessionId?: string): Promise<void>;
  rollbackToCheckpoint(name: string, sessionId?: string): Promise<void>;
}

export class CheckpointManager {
  private registries = new Set<ICheckpointable>();

  public register(target: ICheckpointable): void {
    this.registries.add(target);
  }

  public unregister(target: ICheckpointable): void {
    this.registries.delete(target);
  }

  private getCheckpointsDir(): string {
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    return path.resolve(wsRoot, 'runtime/checkpoints');
  }

  public async createCheckpoint(name: string, sessionId?: string): Promise<void> {
    const cpDir = this.getCheckpointsDir();
    if (!existsSync(cpDir)) {
      await fs.mkdir(cpDir, { recursive: true });
    }

    for (const target of this.registries) {
      await target.createCheckpoint(name, sessionId);
    }
  }

  public async rollbackToCheckpoint(name: string, sessionId?: string): Promise<void> {
    for (const target of this.registries) {
      await target.rollbackToCheckpoint(name, sessionId);
    }
  }
}

export const checkpointManager = new CheckpointManager();
