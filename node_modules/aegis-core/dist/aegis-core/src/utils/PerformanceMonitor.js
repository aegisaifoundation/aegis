/**
 * PerformanceMonitor — lightweight runtime metrics collector for AEGIS.
 *
 * Enable via environment variable: AEGIS_PERF_METRICS=true
 *
 * Usage:
 *   const t = PerformanceMonitor.startTimer('turn.latency');
 *   // ... do work ...
 *   PerformanceMonitor.endTimer(t);
 *
 *   console.log(PerformanceMonitor.report());
 */
const enabled = process.env.AEGIS_PERF_METRICS === 'true';
const metrics = new Map();
const MAX_SAMPLES = 100;
function getOrCreate(label) {
    let stats = metrics.get(label);
    if (!stats) {
        stats = { count: 0, totalMs: 0, minMs: Infinity, maxMs: 0, samples: [] };
        metrics.set(label, stats);
    }
    return stats;
}
function recordDuration(label, durationMs) {
    const stats = getOrCreate(label);
    stats.count++;
    stats.totalMs += durationMs;
    if (durationMs < stats.minMs)
        stats.minMs = durationMs;
    if (durationMs > stats.maxMs)
        stats.maxMs = durationMs;
    if (stats.samples.length >= MAX_SAMPLES)
        stats.samples.shift();
    stats.samples.push(durationMs);
}
function percentile(sortedSamples, p) {
    if (sortedSamples.length === 0)
        return 0;
    const idx = Math.floor((p / 100) * sortedSamples.length);
    return sortedSamples[Math.min(idx, sortedSamples.length - 1)];
}
export class PerformanceMonitor {
    /**
     * Starts a timer for a named metric. Returns an opaque handle.
     * If metrics are disabled, returns a no-op handle.
     */
    static startTimer(label) {
        return { label, startMs: enabled ? performance.now() : 0 };
    }
    /**
     * Ends a timer and records the elapsed duration.
     */
    static endTimer(handle) {
        if (!enabled)
            return 0;
        const durationMs = performance.now() - handle.startMs;
        recordDuration(handle.label, durationMs);
        return durationMs;
    }
    /**
     * Records a single raw duration measurement without a timer handle.
     */
    static record(label, durationMs) {
        if (!enabled)
            return;
        recordDuration(label, durationMs);
    }
    /**
     * Increments a counter metric.
     */
    static count(label) {
        if (!enabled)
            return;
        const stats = getOrCreate(label);
        stats.count++;
    }
    /**
     * Returns a formatted performance report string.
     */
    static report() {
        if (!enabled || metrics.size === 0) {
            return '[PerformanceMonitor] No metrics recorded (set AEGIS_PERF_METRICS=true to enable).';
        }
        const lines = ['', '═══ AEGIS Performance Report ═══', ''];
        for (const [label, stats] of metrics.entries()) {
            const avg = stats.count > 0 ? (stats.totalMs / stats.count).toFixed(2) : '0';
            const sorted = [...stats.samples].sort((a, b) => a - b);
            const p50 = percentile(sorted, 50).toFixed(2);
            const p95 = percentile(sorted, 95).toFixed(2);
            const p99 = percentile(sorted, 99).toFixed(2);
            lines.push(`  ${label}`);
            lines.push(`    count=${stats.count}  avg=${avg}ms  min=${stats.minMs === Infinity ? 0 : stats.minMs.toFixed(2)}ms  max=${stats.maxMs.toFixed(2)}ms`);
            if (stats.samples.length > 0) {
                lines.push(`    p50=${p50}ms  p95=${p95}ms  p99=${p99}ms`);
            }
            lines.push('');
        }
        lines.push('═══════════════════════════════════');
        return lines.join('\n');
    }
    /**
     * Resets all recorded metrics.
     */
    static reset() {
        metrics.clear();
    }
    /**
     * Returns raw stats for a specific label, or null if not recorded.
     */
    static getStats(label) {
        return metrics.get(label) ?? null;
    }
}
export default PerformanceMonitor;
