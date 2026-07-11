import { RuntimeStatus } from '../types/Runtime.js';
export declare class RuntimeExecutor {
    private status;
    private maxSteps;
    getStatus(): RuntimeStatus;
    setStatus(status: RuntimeStatus): void;
    execute(userInput: string): Promise<void>;
    interrupt(): void;
}
export declare const runtimeExecutor: RuntimeExecutor;
