import path from 'path';
import { existsSync } from 'fs';
import { workspaceManager } from '@aegis/runtime';
import { safeJsonRead, safeJsonWrite } from '../utils/MemoryFileHelpers.js';
// ── Module-level in-memory cache ─────────────────────────────────
let registryCache = null;
let persistTimer = null;
let cacheDirty = false;
function getIndexFilePath() {
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    return path.resolve(wsRoot, 'memory/indexes/registry.json');
}
async function ensureCacheLoaded() {
    if (registryCache)
        return;
    const filePath = getIndexFilePath();
    registryCache = await safeJsonRead(filePath, { sessions: {} });
}
function schedulePersist() {
    if (persistTimer)
        return;
    // Debounced write: flush 2 seconds after the last change
    persistTimer = setTimeout(async () => {
        persistTimer = null;
        if (cacheDirty && registryCache) {
            try {
                await safeJsonWrite(getIndexFilePath(), registryCache);
                cacheDirty = false;
            }
            catch (err) {
                console.error('[MemoryIndexManager] Failed to persist registry cache:', err);
            }
        }
    }, 2000);
}
export class MemoryIndexManager {
    /**
     * Registers or updates a session metadata entry inside the in-memory index.
     * Persists asynchronously (debounced).
     */
    static async registerSession(metadata) {
        try {
            await ensureCacheLoaded();
            registryCache.sessions[metadata.sessionId] = {
                sessionId: metadata.sessionId,
                tags: metadata.tags || [],
                createdAt: metadata.createdAt,
                updatedAt: metadata.updatedAt,
                lastAccessedAt: metadata.lastAccessedAt,
                lifecycleState: metadata.lifecycleState,
                displayName: metadata.displayName,
                description: metadata.description
            };
            cacheDirty = true;
            schedulePersist();
        }
        catch (err) {
            console.error('[MemoryIndexManager] Failed to register session index:', err);
        }
    }
    /**
     * Unregisters a session metadata entry from the in-memory index.
     * Persists asynchronously (debounced).
     */
    static async unregisterSession(sessionId) {
        try {
            await ensureCacheLoaded();
            if (registryCache.sessions[sessionId]) {
                delete registryCache.sessions[sessionId];
                cacheDirty = true;
                schedulePersist();
            }
        }
        catch (err) {
            console.error('[MemoryIndexManager] Failed to unregister session index:', err);
        }
    }
    /**
     * Queries sessions filtering by a specific tag — served entirely from cache.
     */
    static async querySessionsByTag(tag) {
        try {
            await ensureCacheLoaded();
            return Object.values(registryCache.sessions)
                .filter(s => s.tags && s.tags.includes(tag))
                .map(s => s.sessionId);
        }
        catch {
            return [];
        }
    }
    /**
     * Returns list of all indexed session summaries from cache.
     * Removes stale sessions that no longer exist on disk (lazy cleanup).
     */
    static async listSessions() {
        try {
            await ensureCacheLoaded();
            const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
            let changed = false;
            for (const sessionId of Object.keys(registryCache.sessions)) {
                const sessionDir = path.resolve(wsRoot, `memory/sessions/${sessionId}`);
                const trashDir = path.resolve(wsRoot, `memory/trash/${sessionId}`);
                const quarantineDir = path.resolve(wsRoot, `memory/quarantine/${sessionId}`);
                if (!existsSync(sessionDir) && !existsSync(trashDir) && !existsSync(quarantineDir)) {
                    delete registryCache.sessions[sessionId];
                    changed = true;
                }
            }
            if (changed) {
                cacheDirty = true;
                schedulePersist();
            }
            return Object.values(registryCache.sessions);
        }
        catch {
            return [];
        }
    }
    /**
     * Forces an immediate flush of the registry to disk.
     * Call on shutdown or checkpoint.
     */
    static async flush() {
        if (persistTimer) {
            clearTimeout(persistTimer);
            persistTimer = null;
        }
        if (cacheDirty && registryCache) {
            await safeJsonWrite(getIndexFilePath(), registryCache);
            cacheDirty = false;
        }
    }
    /**
     * Invalidates the in-memory cache — forces reload from disk on next access.
     */
    static invalidateCache() {
        registryCache = null;
        cacheDirty = false;
    }
}
