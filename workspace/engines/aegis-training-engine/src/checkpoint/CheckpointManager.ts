import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

export interface CheckpointMetadata {
  jobId: string;
  name: string;
  step: number;
  epoch: number;
  loss: number;
  accuracy?: number;
  timestamp: string;
}

export class CheckpointManager {
  private workspaceRoot: string;

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
  }

  private getCheckpointDir(jobId: string): string {
    return path.resolve(this.workspaceRoot, '.aegis/checkpoints', jobId);
  }

  async saveCheckpoint(jobId: string, name: string, data: Omit<CheckpointMetadata, 'timestamp' | 'jobId'>): Promise<string> {
    const dir = path.join(this.getCheckpointDir(jobId), name);
    if (!existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }

    const metadata: CheckpointMetadata = {
      ...data,
      jobId,
      timestamp: new Date().toISOString()
    };

    const metaPath = path.join(dir, 'metadata.json');
    await fs.writeFile(metaPath, JSON.stringify(metadata, null, 2), 'utf8');

    // Perform auto cleanup of older checkpoints (keep last 3, plus final)
    await this.cleanupOldCheckpoints(jobId);

    return dir;
  }

  async listCheckpoints(jobId: string): Promise<CheckpointMetadata[]> {
    const dir = this.getCheckpointDir(jobId);
    if (!existsSync(dir)) return [];

    const checkpoints: CheckpointMetadata[] = [];
    const entries = await fs.readdir(dir);
    for (const name of entries) {
      const metaPath = path.join(dir, name, 'metadata.json');
      if (existsSync(metaPath)) {
        try {
          const raw = await fs.readFile(metaPath, 'utf8');
          checkpoints.push(JSON.parse(raw));
        } catch {}
      }
    }
    return checkpoints.sort((a, b) => a.step - b.step);
  }

  async cleanupOldCheckpoints(jobId: string, maxToKeep = 3): Promise<void> {
    const dir = this.getCheckpointDir(jobId);
    if (!existsSync(dir)) return;

    const list = await this.listCheckpoints(jobId);
    // Keep final checkpoint always
    const candidates = list.filter(cp => cp.name !== 'checkpoint-final');

    if (candidates.length > maxToKeep) {
      const toDeleteCount = candidates.length - maxToKeep;
      const toDelete = candidates.slice(0, toDeleteCount);

      for (const cp of toDelete) {
        const cpDir = path.join(dir, cp.name);
        try {
          await fs.rm(cpDir, { recursive: true, force: true });
          console.log(`[CheckpointManager] Cleaned up old checkpoint: ${cp.name}`);
        } catch {}
      }
    }
  }

  async clearAll(jobId: string): Promise<void> {
    const dir = this.getCheckpointDir(jobId);
    if (existsSync(dir)) {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }
}

export const checkpointManager = new CheckpointManager();
export default checkpointManager;
