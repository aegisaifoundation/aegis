import { workspaceManager } from '../../../aegis-core/src/runtime/WorkspaceManager.js';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
export default async function execute(input, context) {
    const parts = input.trim().split(/\s+/).filter(Boolean);
    if (parts.length < 2) {
        return {
            success: false,
            message: 'Usage: /delete-snapshot <session-id> <snapshot-file-name | all>'
        };
    }
    const sessionId = parts[0];
    const target = parts[1];
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    const snapshotDir = path.resolve(wsRoot, `memory/snapshots/${sessionId}`);
    if (!existsSync(snapshotDir)) {
        return {
            success: false,
            message: `No snapshots directory found for session ${sessionId}.`
        };
    }
    try {
        if (target === 'all') {
            const files = await fs.readdir(snapshotDir);
            let count = 0;
            for (const file of files) {
                if (file.endsWith('.snap')) {
                    await fs.rm(path.join(snapshotDir, file), { force: true });
                    count++;
                }
            }
            return {
                success: true,
                message: `Successfully deleted all (${count}) snapshots for session ${sessionId}.`
            };
        }
        const snapPath = path.join(snapshotDir, target);
        if (!existsSync(snapPath)) {
            return {
                success: false,
                message: `Snapshot file ${target} not found for session ${sessionId}.`
            };
        }
        await fs.rm(snapPath, { force: true });
        return {
            success: true,
            message: `Successfully deleted snapshot file ${target} for session ${sessionId}.`
        };
    }
    catch (err) {
        return {
            success: false,
            message: `Failed to delete snapshot: ${err.message}`
        };
    }
}
