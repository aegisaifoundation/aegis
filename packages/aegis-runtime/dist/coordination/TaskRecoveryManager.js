import { CoordinationError, CoordinationErrorCode } from '@aegis/sdk';
export class TaskRecoveryManager {
    leases = new Map();
    grantLease(taskId, executionAttempt, workerNodeId, durationMs = 10000) {
        const leaseId = `lease-${taskId}-${executionAttempt}`;
        const lease = {
            taskId,
            executionAttempt,
            workerNodeId,
            leaseId,
            leaseExpiresAt: Date.now() + durationMs
        };
        this.leases.set(taskId, lease);
        return lease;
    }
    renewLease(taskId, durationMs = 10000) {
        const lease = this.leases.get(taskId);
        if (!lease)
            return false;
        lease.leaseExpiresAt = Date.now() + durationMs;
        return true;
    }
    revokeLease(taskId) {
        this.leases.delete(taskId);
    }
    isLeaseExpired(taskId) {
        const lease = this.leases.get(taskId);
        if (!lease)
            return true;
        return Date.now() > lease.leaseExpiresAt;
    }
    getLease(taskId) {
        return this.leases.get(taskId);
    }
    prepareReassignment(task, maxAttempts = 3) {
        if (task.executionAttempt >= maxAttempts) {
            throw new CoordinationError(CoordinationErrorCode.TASK_EXECUTION_FAILED, `Task "${task.taskId}" exceeded maximum execution attempts (${maxAttempts}).`);
        }
        // Preserve exact canonical taskId, increment attempt number
        return {
            ...task,
            executionAttempt: task.executionAttempt + 1,
            assignedNodeId: undefined
        };
    }
    clear() {
        this.leases.clear();
    }
}
