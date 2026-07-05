import { Message } from '@aegis/runtime';
import { IMemoryGateway } from './interfaces/IMemoryGateway.js';
import { SessionMetadata, MemoryEntity, SessionState } from './interfaces/MemoryTypes.js';
export declare class MemoryGateway implements IMemoryGateway {
    private static instance;
    /** Cached session metadata, keyed by sessionId. */
    private metadataCache;
    /** Buffered in-memory history per session, keyed by sessionId. */
    private historyCache;
    /** Tracks whether historyCache has unflushed writes. */
    private historyDirty;
    /** lastAccessedAt flush debounce: tracks which sessions need the timestamp flushed. */
    private accessedSessions;
    /** Whether the background flush timer is running. */
    private flushTimerRunning;
    static getInstance(): MemoryGateway;
    private getSessionDir;
    /** Invalidate cached metadata for a session (e.g., after a write). */
    invalidateMetadataCache(sessionId: string): void;
    /** Flush pending lastAccessedAt updates to disk (called at turn boundary / shutdown). */
    flushAccessTimestamps(): Promise<void>;
    /** Flush buffered history for a specific session to disk. Called at turn boundary. */
    flushHistory(sessionId: string): Promise<void>;
    /** Flush all dirty session histories + pending write buffer. */
    flushAll(): Promise<void>;
    /**
     * Initializes a session file hierarchy including raw history, working memory, and session memory.
     */
    createSession(sessionId: string, tags?: string[], actor?: string): Promise<SessionMetadata>;
    /**
     * Loads the session metadata. Checks permissions and updates last accessed (buffered).
     */
    loadSession(sessionId: string, actor?: string): Promise<SessionMetadata>;
    /**
     * Permanently deletes a session and its associated storage structures.
     */
    deleteSession(sessionId: string, actor?: string): Promise<void>;
    /**
     * Reads the working memory Markdown file for a session.
     */
    getWorkingMemory(sessionId: string, actor?: string): Promise<string>;
    /**
     * Atomically overwrites working memory after validation.
     */
    updateWorkingMemory(sessionId: string, content: string, txId?: string, actor?: string): Promise<void>;
    /**
     * Reads session memory facts.
     */
    getSessionMemory(sessionId: string, actor?: string): Promise<string>;
    /**
     * Atomically updates session memory after validation.
     */
    updateSessionMemory(sessionId: string, content: string, txId?: string, actor?: string): Promise<void>;
    /**
     * Appends interaction logs to history — buffered in-memory, flushed at turn boundary.
     */
    appendHistory(sessionId: string, message: Message, actor?: string): Promise<void>;
    /**
     * Reads raw history — returns in-memory cache when available.
     */
    getHistory(sessionId: string, actor?: string): Promise<Message[]>;
    /**
     * Reads dynamic cognitive entities stored in entities.json.
     */
    getEntities(sessionId: string, actor?: string): Promise<MemoryEntity[]>;
    /**
     * Adds or updates a Cognitive Entity inside entities.json.
     */
    updateEntity(sessionId: string, entity: MemoryEntity, actor?: string): Promise<void>;
    /**
     * Reads session-state.json from disk and parses it.
     */
    getSessionState(sessionId: string, actor?: string): Promise<SessionState>;
    /**
     * Writes session-state.json — uses write buffer for non-critical path, direct write inside transactions.
     */
    updateSessionState(sessionId: string, state: SessionState, txId?: string, actor?: string): Promise<void>;
    /**
     * Reads the task Markdown file for a session.
     */
    getTask(sessionId: string, actor?: string): Promise<string>;
    /**
     * Atomically overwrites task memory.
     */
    updateTask(sessionId: string, content: string, txId?: string, actor?: string): Promise<void>;
}
export declare const memoryGateway: MemoryGateway;
