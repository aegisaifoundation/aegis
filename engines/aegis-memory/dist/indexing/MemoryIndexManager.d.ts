import { SessionMetadata } from '../interfaces/MemoryTypes.js';
interface IndexEntry {
    sessionId: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
    lastAccessedAt: string;
    lifecycleState: string;
    displayName?: string;
    description?: string;
}
export declare class MemoryIndexManager {
    /**
     * Registers or updates a session metadata entry inside the in-memory index.
     * Persists asynchronously (debounced).
     */
    static registerSession(metadata: SessionMetadata): Promise<void>;
    /**
     * Unregisters a session metadata entry from the in-memory index.
     * Persists asynchronously (debounced).
     */
    static unregisterSession(sessionId: string): Promise<void>;
    /**
     * Queries sessions filtering by a specific tag — served entirely from cache.
     */
    static querySessionsByTag(tag: string): Promise<string[]>;
    /**
     * Returns list of all indexed session summaries from cache.
     * Removes stale sessions that no longer exist on disk (lazy cleanup).
     */
    static listSessions(): Promise<IndexEntry[]>;
    /**
     * Forces an immediate flush of the registry to disk.
     * Call on shutdown or checkpoint.
     */
    static flush(): Promise<void>;
    /**
     * Invalidates the in-memory cache — forces reload from disk on next access.
     */
    static invalidateCache(): void;
}
export {};
