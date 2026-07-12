export class RuntimeState {
    status = 'IDLE';
    step = 0;
    maxSteps = 5;
    interrupted = false;
    toolExecuted = false;
    setStatus(status) {
        this.status = status;
    }
    getStatus() {
        return this.status;
    }
    setStep(step) {
        this.step = step;
    }
    getStep() {
        return this.step;
    }
    setMaxSteps(maxSteps) {
        this.maxSteps = maxSteps;
    }
    getMaxSteps() {
        return this.maxSteps;
    }
    setInterrupted(interrupted) {
        this.interrupted = interrupted;
    }
    isInterrupted() {
        return this.interrupted;
    }
    setToolExecuted(toolExecuted) {
        this.toolExecuted = toolExecuted;
    }
    isToolExecuted() {
        return this.toolExecuted;
    }
    getLoopState() {
        return {
            status: this.status,
            step: this.step,
            maxSteps: this.maxSteps,
            interrupted: this.interrupted,
            toolExecuted: this.toolExecuted,
        };
    }
    reset(maxSteps = 5) {
        this.status = 'IDLE';
        this.step = 0;
        this.maxSteps = maxSteps;
        this.interrupted = false;
        this.toolExecuted = false;
    }
}
export const runtimeState = new RuntimeState();
