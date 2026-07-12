export class MetricsCollector {
    startTime = null;
    messageCount = 0;
    bytesTransmitted = 0;
    lastLatencyMs = 0;
    latencies = [];
    constructor() { }
    start() {
        this.startTime = new Date();
        this.messageCount = 0;
        this.bytesTransmitted = 0;
        this.latencies = [];
    }
    stop() {
        this.startTime = null;
    }
    recordMessage(bytes) {
        this.messageCount++;
        this.bytesTransmitted += bytes;
    }
    recordLatency(ms) {
        this.lastLatencyMs = ms;
        this.latencies.push(ms);
        if (this.latencies.length > 50) {
            this.latencies.shift(); // Keep moving window of last 50 latencies
        }
    }
    getUptimeMs() {
        return this.startTime ? Date.now() - this.startTime.getTime() : 0;
    }
    getAverageLatencyMs() {
        if (this.latencies.length === 0)
            return 0;
        const sum = this.latencies.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.latencies.length);
    }
    getMetricsSummary() {
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
//# sourceMappingURL=MetricsCollector.js.map