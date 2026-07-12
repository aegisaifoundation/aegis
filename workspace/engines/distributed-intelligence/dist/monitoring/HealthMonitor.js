import { EngineState } from '../state/EngineState.js';
export class HealthMonitor {
    stateMachine;
    restartManager;
    metricsCollector;
    lastHeartbeatAt = null;
    missedHeartbeats = 0;
    constructor(stateMachine, restartManager, metricsCollector) {
        this.stateMachine = stateMachine;
        this.restartManager = restartManager;
        this.metricsCollector = metricsCollector;
    }
    recordHeartbeat() {
        this.lastHeartbeatAt = new Date();
        this.missedHeartbeats = 0;
    }
    recordMissedHeartbeat() {
        this.missedHeartbeats++;
    }
    getHealthReport() {
        const state = this.stateMachine.getState();
        const restartCount = this.restartManager.getRestartCount();
        const avgLatency = this.metricsCollector.getAverageLatencyMs();
        let status = 'HEALTHY';
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
        }
        else if (state === EngineState.RECOVERING) {
            status = 'DEGRADED';
            message = 'Engine is undergoing automatic recovery';
            score = Math.min(score, 50);
        }
        else if (state === EngineState.DEGRADED) {
            status = 'DEGRADED';
            message = 'Engine is operational but in degraded mode';
            score = Math.min(score, 60);
        }
        else if (state === EngineState.STOPPING || state === EngineState.STOPPED) {
            status = 'UNHEALTHY';
            message = `Engine is not running (${state})`;
            score = 0;
        }
        else if (this.missedHeartbeats > 0) {
            status = 'DEGRADED';
            message = `Engine missed ${this.missedHeartbeats} heartbeat checks`;
        }
        if (score < 30 && status === 'HEALTHY') {
            status = 'UNHEALTHY';
        }
        else if (score < 70 && status === 'HEALTHY') {
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
//# sourceMappingURL=HealthMonitor.js.map