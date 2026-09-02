import { IAegisDistributedTask, IAegisTaskResult } from '@aegis/sdk';
export type TaskHandler<TReq = any, TRes = any> = (task: IAegisDistributedTask<TReq>, reportProgress: (progressFraction: number, statusMessage?: string) => void) => Promise<TRes>;
export declare class TaskWorkerRuntime {
    private readonly localNodeId;
    private readonly maxConcurrentTasks;
    private readonly maxQueuedTasks;
    private handlers;
    private executionRegistry;
    private activeExecutions;
    private activeCount;
    constructor(localNodeId: string, maxConcurrentTasks?: number, maxQueuedTasks?: number);
    registerTaskHandler(taskType: string, handler: TaskHandler): void;
    unregisterTaskHandler(taskType: string): void;
    getActiveCount(): number;
    canAcceptTask(task: IAegisDistributedTask): {
        canAccept: boolean;
        reason?: string;
    };
    executeTask<TRes = any>(task: IAegisDistributedTask, onProgress?: (progressFraction: number, statusMessage?: string) => void): Promise<IAegisTaskResult<TRes>>;
    cancelTask(taskId: string): boolean;
}
