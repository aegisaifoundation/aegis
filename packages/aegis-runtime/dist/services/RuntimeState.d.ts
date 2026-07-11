import { RuntimeStatus, RuntimeLoopState } from '../types/Runtime.js';
export declare class RuntimeState {
    private status;
    private step;
    private maxSteps;
    private interrupted;
    private toolExecuted;
    setStatus(status: RuntimeStatus): void;
    getStatus(): RuntimeStatus;
    setStep(step: number): void;
    getStep(): number;
    setMaxSteps(maxSteps: number): void;
    getMaxSteps(): number;
    setInterrupted(interrupted: boolean): void;
    isInterrupted(): boolean;
    setToolExecuted(toolExecuted: boolean): void;
    isToolExecuted(): boolean;
    getLoopState(): RuntimeLoopState;
    reset(maxSteps?: number): void;
}
export declare const runtimeState: RuntimeState;
