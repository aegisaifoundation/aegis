export declare class MemoryObservability {
    /**
     * Log a general runtime event into the episodic log file (events.jsonl).
     * Fire-and-forget — never awaited in the hot path.
     */
    static logEvent(event: Record<string, any>): void;
    /**
     * Async version of logEvent for compatibility. Still non-blocking in practice.
     */
    static logEventAsync(event: Record<string, any>): Promise<void>;
    /**
     * Fire-and-forget audit log — never awaited, does not block the caller.
     */
    static logAuditAsync(actor: string, action: 'read' | 'write' | 'delete' | 'refine' | 'snapshot' | 'restore', targetType: string, targetId: string, details?: Record<string, any>): void;
    /**
     * Awaitable audit log for compatibility — delegates to logAuditAsync.
     */
    static logAudit(actor: string, action: 'read' | 'write' | 'delete' | 'refine' | 'snapshot' | 'restore', targetType: string, targetId: string, details?: Record<string, any>): Promise<void>;
    /**
     * Forces an immediate flush of all buffered log entries.
     * Called on shutdown or checkpoint.
     */
    static flush(): Promise<void>;
    /**
     * Stops the auto-flush timer and flushes remaining entries.
     */
    static shutdown(): Promise<void>;
}
