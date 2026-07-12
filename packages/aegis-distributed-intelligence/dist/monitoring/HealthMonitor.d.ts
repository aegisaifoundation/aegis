import { EngineStateMachine } from '../state/EngineStateMachine.js';
import { RestartManager } from '../lifecycle/RestartManager.js';
import { MetricsCollector } from './MetricsCollector.js';
import { EngineHealthReport } from '@aegis/sdk';
export declare class HealthMonitor {
    private stateMachine;
    private restartManager;
    private metricsCollector;
    private lastHeartbeatAt;
    private missedHeartbeats;
    constructor(stateMachine: EngineStateMachine, restartManager: RestartManager, metricsCollector: MetricsCollector);
    recordHeartbeat(): void;
    recordMissedHeartbeat(): void;
    getHealthReport(): EngineHealthReport;
}
export default HealthMonitor;
//# sourceMappingURL=HealthMonitor.d.ts.map