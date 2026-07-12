export declare class RuntimeSupervisorHooks {
    private static getTraceFilePath;
    /**
     * Appends execution trace info to boot-trace.jsonl.
     */
    static writeTrace(stage: string, details?: Record<string, any>): Promise<void>;
    static onRuntimeDegraded(reason: string): Promise<void>;
    static onRuntimeRecovered(sessionId: string): Promise<void>;
    static onRuntimeQuarantined(sessionId: string, reason: string): Promise<void>;
    static onRuntimeCorrupted(reason: string): Promise<void>;
    static onRuntimeSafeModeEntered(reason: string): Promise<void>;
    static onMountLeaseExpired(sessionId: string, leaseOwner: string): Promise<void>;
}
