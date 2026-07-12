import { EngineState } from './EngineState.js';
export declare class EngineStateMachine {
    private state;
    private listeners;
    private static readonly VALID_TRANSITIONS;
    getState(): EngineState;
    transitionTo(nextState: EngineState): void;
    onTransition(listener: (state: EngineState, previous: EngineState) => void): () => void;
    private notify;
}
export default EngineStateMachine;
//# sourceMappingURL=EngineStateMachine.d.ts.map