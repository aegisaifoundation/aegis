export declare enum ExecutionAttemptStatus {
    STARTED = "STARTED",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED"
}
export interface ExecutionAttemptRecord {
    taskId: string;
    executionAttempt: number;
    status: ExecutionAttemptStatus;
    startedAt: number;
    completedAt?: number;
    result?: any;
    error?: any;
}
export declare class TaskExecutionRegistry {
    private attempts;
    private makeKey;
    isAttemptRecorded(taskId: string, executionAttempt: number): boolean;
    registerAttemptStart(taskId: string, executionAttempt: number): void;
    markAttemptCompleted(taskId: string, executionAttempt: number, result: any): void;
    markAttemptFailed(taskId: string, executionAttempt: number, error: any): void;
    getAttempt(taskId: string, executionAttempt: number): ExecutionAttemptRecord | undefined;
    clear(): void;
}
