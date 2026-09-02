import {
  ITaskLease,
  IAegisDistributedTask,
  CoordinationError,
  CoordinationErrorCode
} from '@aegis/sdk';

export class TaskRecoveryManager {
  private leases = new Map<string, ITaskLease>();

  grantLease(taskId: string, executionAttempt: number, workerNodeId: string, durationMs: number = 10000): ITaskLease {
    const leaseId = `lease-${taskId}-${executionAttempt}`;
    const lease: ITaskLease = {
      taskId,
      executionAttempt,
      workerNodeId,
      leaseId,
      leaseExpiresAt: Date.now() + durationMs
    };
    this.leases.set(taskId, lease);
    return lease;
  }

  renewLease(taskId: string, durationMs: number = 10000): boolean {
    const lease = this.leases.get(taskId);
    if (!lease) return false;
    lease.leaseExpiresAt = Date.now() + durationMs;
    return true;
  }

  revokeLease(taskId: string): void {
    this.leases.delete(taskId);
  }

  isLeaseExpired(taskId: string): boolean {
    const lease = this.leases.get(taskId);
    if (!lease) return true;
    return Date.now() > lease.leaseExpiresAt;
  }

  getLease(taskId: string): ITaskLease | undefined {
    return this.leases.get(taskId);
  }

  prepareReassignment(task: IAegisDistributedTask, maxAttempts: number = 3): IAegisDistributedTask {
    if (task.executionAttempt >= maxAttempts) {
      throw new CoordinationError(
        CoordinationErrorCode.TASK_EXECUTION_FAILED,
        `Task "${task.taskId}" exceeded maximum execution attempts (${maxAttempts}).`
      );
    }

    // Preserve exact canonical taskId, increment attempt number
    return {
      ...task,
      executionAttempt: task.executionAttempt + 1,
      assignedNodeId: undefined
    };
  }

  clear(): void {
    this.leases.clear();
  }
}
