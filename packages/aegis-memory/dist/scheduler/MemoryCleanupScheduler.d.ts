export declare class MemoryCleanupScheduler {
    private intervalId;
    /**
     * Starts the background cleanup scheduler loop.
     */
    start(intervalMs?: number): void;
    /**
     * Stops the background cleanup scheduler.
     */
    stop(): void;
    /**
     * Performs periodic session analysis, archiving, and snapshot pruning.
     */
    tick(): Promise<void>;
}
export declare const memoryCleanupScheduler: MemoryCleanupScheduler;
