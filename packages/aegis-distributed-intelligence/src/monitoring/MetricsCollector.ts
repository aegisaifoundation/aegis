export class MetricsCollector {
  private startTime: Date | null = null;
  private messageCount = 0;
  private bytesTransmitted = 0;
  private lastLatencyMs = 0;
  private latencies: number[] = [];

  constructor() {}

  start(): void {
    this.startTime = new Date();
    this.messageCount = 0;
    this.bytesTransmitted = 0;
    this.latencies = [];
  }

  stop(): void {
    this.startTime = null;
  }

  recordMessage(bytes: number): void {
    this.messageCount++;
    this.bytesTransmitted += bytes;
  }

  recordLatency(ms: number): void {
    this.lastLatencyMs = ms;
    this.latencies.push(ms);
    if (this.latencies.length > 50) {
      this.latencies.shift(); // Keep moving window of last 50 latencies
    }
  }

  getUptimeMs(): number {
    return this.startTime ? Date.now() - this.startTime.getTime() : 0;
  }

  getAverageLatencyMs(): number {
    if (this.latencies.length === 0) return 0;
    const sum = this.latencies.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.latencies.length);
  }

  getMetricsSummary(): Record<string, any> {
    return {
      uptimeMs: this.getUptimeMs(),
      messagesTransmitted: this.messageCount,
      bytesTransmitted: this.bytesTransmitted,
      lastLatencyMs: this.lastLatencyMs,
      avgLatencyMs: this.getAverageLatencyMs(),
      pid: process.pid
    };
  }
}
export default MetricsCollector;
