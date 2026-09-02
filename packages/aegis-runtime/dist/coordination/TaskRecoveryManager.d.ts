import { ITaskLease, IAegisDistributedTask } from '@aegis/sdk';
export declare class TaskRecoveryManager {
    private leases;
    grantLease(taskId: string, executionAttempt: number, workerNodeId: string, durationMs?: number): ITaskLease;
    renewLease(taskId: string, durationMs?: number): boolean;
    revokeLease(taskId: string): void;
    isLeaseExpired(taskId: string): boolean;
    getLease(taskId: string): ITaskLease | undefined;
    prepareReassignment(task: IAegisDistributedTask, maxAttempts?: number): IAegisDistributedTask;
    clear(): void;
}
