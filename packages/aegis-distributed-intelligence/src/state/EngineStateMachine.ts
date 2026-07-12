import { EngineState } from './EngineState.js';

export class EngineStateMachine {
  private state: EngineState = EngineState.UNINITIALIZED;
  private listeners: ((state: EngineState, previous: EngineState) => void)[] = [];

  private static readonly VALID_TRANSITIONS: Record<EngineState, Set<EngineState>> = {
    [EngineState.UNINITIALIZED]: new Set([EngineState.INITIALIZING]),
    [EngineState.INITIALIZING]: new Set([EngineState.STARTING, EngineState.FAILED]),
    [EngineState.STARTING]: new Set([EngineState.HANDSHAKING, EngineState.FAILED, EngineState.STOPPING]),
    [EngineState.HANDSHAKING]: new Set([EngineState.LOADING, EngineState.FAILED, EngineState.STOPPING]),
    [EngineState.LOADING]: new Set([EngineState.READY, EngineState.FAILED, EngineState.STOPPING]),
    [EngineState.READY]: new Set([EngineState.ONLINE, EngineState.FAILED, EngineState.STOPPING]),
    [EngineState.ONLINE]: new Set([EngineState.DEGRADED, EngineState.RECOVERING, EngineState.STOPPING, EngineState.FAILED]),
    [EngineState.DEGRADED]: new Set([EngineState.ONLINE, EngineState.RECOVERING, EngineState.STOPPING, EngineState.FAILED]),
    [EngineState.RECOVERING]: new Set([EngineState.ONLINE, EngineState.FAILED, EngineState.STOPPING]),
    [EngineState.STOPPING]: new Set([EngineState.STOPPED, EngineState.FAILED]),
    [EngineState.STOPPED]: new Set([EngineState.STARTING, EngineState.UNINITIALIZED, EngineState.INITIALIZING]),
    [EngineState.FAILED]: new Set([EngineState.RECOVERING, EngineState.STOPPING, EngineState.UNINITIALIZED, EngineState.STARTING, EngineState.STOPPED])
  };

  getState(): EngineState {
    return this.state;
  }

  transitionTo(nextState: EngineState): void {
    if (this.state === nextState) return;

    const validNextStates = EngineStateMachine.VALID_TRANSITIONS[this.state];
    if (!validNextStates || !validNextStates.has(nextState)) {
      throw new Error(`Invalid state transition: Cannot transition from ${this.state} to ${nextState}`);
    }

    const previous = this.state;
    this.state = nextState;
    this.notify(nextState, previous);
  }

  onTransition(listener: (state: EngineState, previous: EngineState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(state: EngineState, previous: EngineState): void {
    for (const listener of this.listeners) {
      try {
        listener(state, previous);
      } catch (err) {
        console.error('[EngineStateMachine] Error in transition listener:', err);
      }
    }
  }
}
export default EngineStateMachine;
