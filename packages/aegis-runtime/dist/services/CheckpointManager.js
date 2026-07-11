import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { workspaceManager } from '../workspace/WorkspaceManager.js';
export class CheckpointManager {
    registries = new Set();
    register(target) {
        this.registries.add(target);
    }
    unregister(target) {
        this.registries.delete(target);
    }
    getCheckpointsDir() {
        const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
        return path.resolve(wsRoot, 'runtime/checkpoints');
    }
    async createCheckpoint(name) {
        const cpDir = this.getCheckpointsDir();
        if (!existsSync(cpDir)) {
            await fs.mkdir(cpDir, { recursive: true });
        }
        for (const target of this.registries) {
            await target.createCheckpoint(name);
        }
    }
    async rollbackToCheckpoint(name) {
        for (const target of this.registries) {
            await target.rollbackToCheckpoint(name);
        }
    }
}
export const checkpointManager = new CheckpointManager();
