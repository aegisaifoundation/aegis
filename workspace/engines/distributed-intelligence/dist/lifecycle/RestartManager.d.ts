export declare class RestartManager {
    private static MAX_RESTARTS;
    private static INITIAL_DELAY_MS;
    private static BACKOFF_FACTOR;
    private restartCount;
    private lastRestartAt;
    private restartHistory;
    constructor();
    canRestart(): boolean;
    getRestartCount(): number;
    getLastRestartAt(): Date | null;
    getRestartHistory(): Date[];
    recordRestart(): number;
    reset(): void;
    getDelay(): number;
}
export default RestartManager;
//# sourceMappingURL=RestartManager.d.ts.map