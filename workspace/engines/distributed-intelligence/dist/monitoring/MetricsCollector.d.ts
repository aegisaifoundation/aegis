export declare class MetricsCollector {
    private startTime;
    private messageCount;
    private bytesTransmitted;
    private lastLatencyMs;
    private latencies;
    constructor();
    start(): void;
    stop(): void;
    recordMessage(bytes: number): void;
    recordLatency(ms: number): void;
    getUptimeMs(): number;
    getAverageLatencyMs(): number;
    getMetricsSummary(): Record<string, any>;
}
export default MetricsCollector;
//# sourceMappingURL=MetricsCollector.d.ts.map