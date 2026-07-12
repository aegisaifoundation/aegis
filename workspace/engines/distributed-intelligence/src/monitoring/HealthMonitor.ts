import { EngineState } from '../state/EngineState.js';
import { EngineStateMachine } from '../state/EngineStateMachine.js';
import { RestartManager } from '../lifecycle/RestartManager.js';
import { MetricsCollector } from './MetricsCollector.js';
import { EngineHealthReport } from '@aegis/sdk';

export class HealthMonitor {
  private lastHeartbeatAt: Date | null = null;
  private missedHeartbeats = 0;

  constructor(
    private stateMachine: EngineStateMachine,
    private restartManager: RestartManager,
    private metricsCollector: MetricsCollector
  ) {}

  recordHeartbeat(): void {
    this.lastHeartbeatAt = new Date();
    this.missedHeartbeats = 0;
  }

  recordMissedHeartbeat(): void {
    this.missedHeartbeats++;
  }

  getHealthReport(): EngineHealthReport {
    const state = this.stateMachine.getState();
    const restartCount = this.restartManager.getRestartCount();
    const avgLatency = this.metricsCollector.getAverageLatencyMs();

    let status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' = 'HEALTHY';
    let message = 'Engine is healthy';
    let score = 100;

    // Deduct score based on restarts
    score -= restartCount * 25;

    // Deduct score based on missed heartbeats
    score -= this.missedHeartbeats * 20;

    // Adjust based on state machine
    if (state === EngineState.FAILED) {
      status = 'UNHEALTHY';
      message = 'Engine has failed';
      score = 0;
    } else if (state === EngineState.RECOVERING) {
      status = 'DEGRADED';
      message = 'Engine is undergoing automatic recovery';
      score = Math.min(score, 50);
    } else if (state === EngineState.DEGRADED) {
      status = 'DEGRADED';
      message = 'Engine is operational but in degraded mode';
      score = Math.min(score, 60);
    } else if (state === EngineState.STOPPING || state === EngineState.STOPPED) {
      status = 'UNHEALTHY';
      message = `Engine is not running (${state})`;
      score = 0;
    } else if (this.missedHeartbeats > 0) {
      status = 'DEGRADED';
      message = `Engine missed ${this.missedHeartbeats} heartbeat checks`;
    }

    if (score < 30 && status === 'HEALTHY') {
      status = 'UNHEALTHY';
    } else if (score < 70 && status === 'HEALTHY') {
      status = 'DEGRADED';
    }

    return {
      status,
      latencyMs: avgLatency,
      message,
      details: {
        score: Math.max(0, score),
        state,
        restartCount,
        missedHeartbeats: this.missedHeartbeats,
        lastHeartbeatAt: this.lastHeartbeatAt?.toISOString() ?? null
      }
    };
  }
}
export default HealthMonitor;
