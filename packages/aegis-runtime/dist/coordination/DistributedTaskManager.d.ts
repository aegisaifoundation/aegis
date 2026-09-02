import { IAegisDistributedTask, IAegisTaskResult, ITaskRequirements, TaskPriority, TaskState } from '@aegis/sdk';
import { NodeCapabilityRegistry } from './NodeCapabilityRegistry.js';
import { TaskScheduler, SchedulingPolicy } from './TaskScheduler.js';
import { TaskWorkerRuntime } from './TaskWorkerRuntime.js';
import { TaskRecoveryManager } from './TaskRecoveryManager.js';
import { AegisMessageRouter } from '../communication/AegisMessageRouter.js';
import { AegisStateManager } from '../state/AegisStateManager.js';
import { PeerRegistry } from '../networking/PeerRegistry.js';
export interface CreateTaskOptions<T = any> {
    type: string;
    payload: T;
    priority?: TaskPriority;
    requirements?: ITaskRequirements;
    targetNodeId?: string;
    deadline?: number;
    metadata?: Record<string, unknown>;
}
export declare class DistributedTaskManager {
    private readonly localNodeId;
    private readonly messageRouter;
    private readonly peerRegistry;
    private readonly stateManager?;
    private tasks;
    private capabilityRegistry;
    private scheduler;
    private workerRuntime;
    private recoveryManager;
    private progressListeners;
    private completionListeners;
    constructor(localNodeId: string, messageRouter: AegisMessageRouter, peerRegistry: PeerRegistry, options?: {
        maxConcurrentTasks?: number;
        maxQueuedTasks?: number;
    }, stateManager?: AegisStateManager | undefined);
    getCapabilityRegistry(): NodeCapabilityRegistry;
    getScheduler(): TaskScheduler;
    getWorkerRuntime(): TaskWorkerRuntime;
    getRecoveryManager(): TaskRecoveryManager;
    createTask<T = any>(options: CreateTaskOptions<T>): IAegisDistributedTask<T>;
    getTask(taskId: string): IAegisDistributedTask | undefined;
    updateTaskState(taskId: string, newState: TaskState): void;
    persistTaskState(task: IAegisDistributedTask): Promise<void>;
    restorePersistedTasks(): Promise<number>;
    submitTask<TRes = any>(task: IAegisDistributedTask, policy?: Partial<SchedulingPolicy>): Promise<IAegisTaskResult<TRes>>;
    private executeRemoteTask;
    cancelTask(taskId: string): Promise<boolean>;
    onTaskProgress(taskId: string, callback: (fraction: number, msg?: string) => void): void;
    onTaskCompleted(taskId: string, callback: (result: IAegisTaskResult) => void): void;
    private notifyProgress;
    private notifyCompletion;
    private registerCoordinationMessageHandlers;
}
