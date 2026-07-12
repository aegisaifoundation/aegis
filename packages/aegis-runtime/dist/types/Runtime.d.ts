export type RuntimeStatus = 'IDLE' | 'THINKING' | 'EXECUTING_TOOL' | 'INTERRUPTED' | 'ERROR' | 'COMPLETED';
export interface RuntimeLoopState {
    step: number;
    maxSteps: number;
    interrupted: boolean;
    toolExecuted: boolean;
    status: RuntimeStatus;
}
