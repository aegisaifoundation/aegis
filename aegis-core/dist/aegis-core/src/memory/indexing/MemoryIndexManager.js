import path from 'path';
import { workspaceManager } from '../../runtime/WorkspaceManager.js';
import { safeJsonRead, safeJsonWrite } from '../utils/MemoryFileHelpers.js';
export class MemoryIndexManager {
    static getIndexFilePath() {
        const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
        return path.resolve(wsRoot, 'memory/indexes/registry.json');
    }
    /**
     * Registers or updates a session metadata entry inside the index.
     */
    static async registerSession(metadata) {
        try {
            const filePath = this.getIndexFilePath();
            const registry = await safeJsonRead(filePath, { sessions: {} });
            registry.sessions[metadata.sessionId] = {
                sessionId: metadata.sessionId,
                tags: metadata.tags || [],
                createdAt: metadata.createdAt,
                updatedAt: metadata.updatedAt,
                lastAccessedAt: metadata.lastAccessedAt,
                lifecycleState: metadata.lifecycleState,
                displayName: metadata.displayName,
                description: metadata.description
            };
            await safeJsonWrite(filePath, registry);
        }
        catch (err) {
            console.error('[MemoryIndexManager] Failed to register session index:', err);
        }
    }
    /**
     * Unregisters a session metadata entry from the index.
     */
    static async unregisterSession(sessionId) {
        try {
            const filePath = this.getIndexFilePath();
            const registry = await safeJsonRead(filePath, { sessions: {} });
            if (registry.sessions[sessionId]) {
                delete registry.sessions[sessionId];
                await safeJsonWrite(filePath, registry);
            }
        }
        catch (err) {
            console.error('[MemoryIndexManager] Failed to unregister session index:', err);
        }
    }
    /**
     * Queries sessions filtering by a specific tag.
     */
    static async querySessionsByTag(tag) {
        try {
            const filePath = this.getIndexFilePath();
            const registry = await safeJsonRead(filePath, { sessions: {} });
            return Object.values(registry.sessions)
                .filter(s => s.tags && s.tags.includes(tag))
                .map(s => s.sessionId);
        }
        catch {
            return [];
        }
    }
    /**
     * Returns list of all indexed session summaries, cleaning up stale sessions that no longer exist on disk.
     */
    static async listSessions() {
        try {
            const filePath = this.getIndexFilePath();
            const registry = await safeJsonRead(filePath, { sessions: {} });
            const { existsSync } = await import('fs');
            const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
            let changed = false;
            for (const sessionId of Object.keys(registry.sessions)) {
                const sessionDir = path.resolve(wsRoot, `memory/sessions/${sessionId}`);
                const trashDir = path.resolve(wsRoot, `memory/trash/${sessionId}`);
                const quarantineDir = path.resolve(wsRoot, `memory/quarantine/${sessionId}`);
                if (!existsSync(sessionDir) && !existsSync(trashDir) && !existsSync(quarantineDir)) {
                    delete registry.sessions[sessionId];
                    changed = true;
                }
            }
            if (changed) {
                await safeJsonWrite(filePath, registry);
            }
            return Object.values(registry.sessions);
        }
        catch {
            return [];
        }
    }
}
