const enabled = process.env.AEGIS_PERF_METRICS === 'true';

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

const metrics = new Map<string, MetricStats>();
const MAX_SAMPLES = 100;

function getOrCreate(label: string): MetricStats {
  let stats = metrics.get(label);
  if (!stats) {
    stats = { count: 0, totalMs: 0, minMs: Infinity, maxMs: 0, samples: [] };
    metrics.set(label, stats);
  }
  return stats;
}

function recordDuration(label: string, durationMs: number): void {
  const stats = getOrCreate(label);
  stats.count++;
  stats.totalMs += durationMs;
  if (durationMs < stats.minMs) stats.minMs = durationMs;
  if (durationMs > stats.maxMs) stats.maxMs = durationMs;
  if (stats.samples.length >= MAX_SAMPLES) stats.samples.shift();
  stats.samples.push(durationMs);
}

function percentile(sortedSamples: number[], p: number): number {
  if (sortedSamples.length === 0) return 0;
  const idx = Math.floor((p / 100) * sortedSamples.length);
  return sortedSamples[Math.min(idx, sortedSamples.length - 1)];
}

export class PerformanceMonitor {
  public static startTimer(label: string): TimerHandle {
    return { label, startMs: enabled ? performance.now() : 0 };
  }

  public static endTimer(handle: TimerHandle): number {
    if (!enabled) return 0;
    const durationMs = performance.now() - handle.startMs;
    recordDuration(handle.label, durationMs);
    return durationMs;
  }

  public static record(label: string, durationMs: number): void {
    if (!enabled) return;
    recordDuration(label, durationMs);
  }

  public static count(label: string): void {
    if (!enabled) return;
    const stats = getOrCreate(label);
    stats.count++;
  }

  public static report(): string {
    if (!enabled || metrics.size === 0) {
      return '[PerformanceMonitor] No metrics recorded (set AEGIS_PERF_METRICS=true to enable).';
    }

    const lines: string[] = ['', '═══ AEGIS Performance Report ═══', ''];

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

  public static reset(): void {
    metrics.clear();
  }

  public static getStats(label: string): MetricStats | null {
    return metrics.get(label) ?? null;
  }
}

export default PerformanceMonitor;
