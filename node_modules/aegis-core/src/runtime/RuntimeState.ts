import { RuntimeStatus, RuntimeLoopState } from '../types/Runtime.js';

export class RuntimeState {
  private status: RuntimeStatus = 'IDLE';
  private step: number = 0;
  private maxSteps: number = 5;
  private interrupted: boolean = false;
  private toolExecuted: boolean = false;

  setStatus(status: RuntimeStatus) {
    this.status = status;
  }

  getStatus(): RuntimeStatus {
    return this.status;
  }

  setStep(step: number) {
    this.step = step;
  }

  getStep(): number {
    return this.step;
  }

  setMaxSteps(maxSteps: number) {
    this.maxSteps = maxSteps;
  }

  getMaxSteps(): number {
    return this.maxSteps;
  }

  setInterrupted(interrupted: boolean) {
    this.interrupted = interrupted;
  }

  isInterrupted(): boolean {
    return this.interrupted;
  }

  setToolExecuted(toolExecuted: boolean) {
    this.toolExecuted = toolExecuted;
  }

  isToolExecuted(): boolean {
    return this.toolExecuted;
  }

  getLoopState(): RuntimeLoopState {
    return {
      status: this.status,
      step: this.step,
      maxSteps: this.maxSteps,
      interrupted: this.interrupted,
      toolExecuted: this.toolExecuted,
    };
  }

  reset(maxSteps: number = 5) {
    this.status = 'IDLE';
    this.step = 0;
    this.maxSteps = maxSteps;
    this.interrupted = false;
    this.toolExecuted = false;
  }
}

export const runtimeState = new RuntimeState();
