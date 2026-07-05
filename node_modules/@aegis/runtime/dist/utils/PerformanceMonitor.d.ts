interface TimerHandle {
    label: string;
    startMs: number;
}
interface MetricStats {
    count: number;
    totalMs: number;
    minMs: number;
    maxMs: number;
    samples: number[];
}
export declare class PerformanceMonitor {
    static startTimer(label: string): TimerHandle;
    static endTimer(handle: TimerHandle): number;
    static record(label: string, durationMs: number): void;
    static count(label: string): void;
    static report(): string;
    static reset(): void;
    static getStats(label: string): MetricStats | null;
}
export default PerformanceMonitor;
