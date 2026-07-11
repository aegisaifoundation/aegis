export declare class RuntimeSessionManager {
    private static instance;
    private heartbeatInterval;
    private watchdogInterval;
    static getInstance(): RuntimeSessionManager;
    /**
     * Initializes the session orchestrator, checks boot modes, restores context, and starts watchdogs.
     */
    initialize(): Promise<void>;
    /**
     * Deterministically recovers the runtime from checkpoint, or resets to clean state.
     */
    recoverRuntime(): Promise<void>;
    /**
     * Cleans active leases and updates state flags on shutdown.
     */
    shutdown(): Promise<void>;
    /**
     * Creates a fresh, clean session context within transaction lock hooks.
     */
    createNewSession(tags?: string[], actor?: string): Promise<any>;
    /**
     * Switches runtime execution focus to another session.
     * Leverages transaction rolls to guarantee atomic file swaps.
     */
    checkoutSession(sessionId: string, actor?: string): Promise<void>;
    /**
     * Forks target session. Clones Markdown files but leaves history logs empty to prevent bloat.
     */
    forkSession(sessionId: string, actor?: string): Promise<string>;
    renameSession(sessionId: string, displayName: string, description: string, actor?: string): Promise<void>;
    /**
     * Soft deletes a session by moving its directory to workspace/memory/trash/.
     */
    deleteSession(sessionId: string, actor?: string): Promise<void>;
    /**
     * Restores a soft-deleted session from trash.
     */
    resumeSession(sessionId: string, actor?: string): Promise<void>;
    archiveCurrentSession(actor?: string): Promise<void>;
    mountSession(sessionId: string): Promise<void>;
    unmountCurrentSession(): Promise<void>;
    getActiveSession(): Promise<string | null>;
    listSessions(): Promise<any[]>;
    private startHeartbeat;
    private stopHeartbeat;
}
export declare const runtimeSessionManager: RuntimeSessionManager;
