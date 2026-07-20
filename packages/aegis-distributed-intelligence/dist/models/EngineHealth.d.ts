import { EngineState } from '../state/EngineState.js';
export interface EngineHealth {
    score: number;
    state: EngineState;
    restartCount: number;
    missedHeartbeats: number;
    lastHeartbeatAt: string | null;
}
//# sourceMappingURL=EngineHealth.d.ts.map