import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { workspaceManager, eventBus } from '@aegis/runtime';
import { MemoryLifecycleState } from '../interfaces/MemoryTypes.js';
import { safeJsonWrite, writeMemoryFile } from '../utils/MemoryFileHelpers.js';
export class MemoryRecoveryManager {
    /**
     * Attempts to restore corrupted memory files (history.json, session-memory.md, working-memory.md)
     * from the latest point-in-time snapshot.
     */
    static async recoverFromSnapshot(sessionId, fileType, targetFilePath) {
        const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
        const snapshotDir = path.resolve(wsRoot, `memory/snapshots/${sessionId}`);
        if (!existsSync(snapshotDir)) {
            return false;
        }
        try {
            const files = await fs.readdir(snapshotDir);
            const prefix = fileType === 'sessionMemory' ? 'session-memory' :
                fileType === 'workingMemory' ? 'working-memory' : 'history';
            // Sort snaps ascending (by timestamp in file name) to pick the newest
            const snaps = files
                .filter(f => f.startsWith(prefix) && f.endsWith('.snap'))
                .sort();
            if (snaps.length === 0) {
                return false;
            }
            const latestSnap = snaps[snaps.length - 1];
            const snapPath = path.join(snapshotDir, latestSnap);
            const content = await fs.readFile(snapPath, 'utf8');
            // Write content atomically to overwrite the corrupt file
            await writeMemoryFile(targetFilePath, content);
            eventBus.emit('memory.restored', { sessionId, fileType, snapshot: latestSnap }, 'memory-system');
            return true;
        }
        catch (err) {
            console.error(`[MemoryRecoveryManager] Recovery failed for ${fileType} in session ${sessionId}:`, err);
            return false;
        }
    }
    /**
     * Repairs metadata.json by regenerating standard keys if it is unreadable.
     */
    static async repairMetadata(sessionId, metadataFilePath, historyChecksum, sessionChecksum, workingChecksum) {
        const repaired = {
            sessionId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastAccessedAt: new Date().toISOString(),
            memoryVersion: '1.0.0',
            lifecycleState: MemoryLifecycleState.ACTIVE,
            checksums: {
                history: historyChecksum,
                sessionMemory: sessionChecksum,
                workingMemory: workingChecksum
            },
            confidence: {},
            tags: ['repaired'],
            quotas: {
                maxSessions: 100,
                maxHistorySize: 10 * 1024 * 1024,
                maxWorkingMemorySize: 1500,
                maxSessionMemorySize: 1000,
                maxSnapshots: 10
            }
        };
        await safeJsonWrite(metadataFilePath, repaired);
        return repaired;
    }
}
