import { CoordinationError, CoordinationErrorCode } from '@aegis/sdk';
export var ExecutionAttemptStatus;
(function (ExecutionAttemptStatus) {
    ExecutionAttemptStatus["STARTED"] = "STARTED";
    ExecutionAttemptStatus["COMPLETED"] = "COMPLETED";
    ExecutionAttemptStatus["FAILED"] = "FAILED";
})(ExecutionAttemptStatus || (ExecutionAttemptStatus = {}));
export class TaskExecutionRegistry {
    attempts = new Map();
    makeKey(taskId, executionAttempt) {
        return `${taskId}:${executionAttempt}`;
    }
    isAttemptRecorded(taskId, executionAttempt) {
        return this.attempts.has(this.makeKey(taskId, executionAttempt));
    }
    registerAttemptStart(taskId, executionAttempt) {
        const key = this.makeKey(taskId, executionAttempt);
        if (this.attempts.has(key)) {
            throw new CoordinationError(CoordinationErrorCode.TASK_DUPLICATE_EXECUTION, `Execution attempt ${executionAttempt} for task "${taskId}" is already recorded on this node.`);
        }
        this.attempts.set(key, {
            taskId,
            executionAttempt,
            status: ExecutionAttemptStatus.STARTED,
            startedAt: Date.now()
        });
    }
    markAttemptCompleted(taskId, executionAttempt, result) {
        const key = this.makeKey(taskId, executionAttempt);
        const record = this.attempts.get(key);
        if (record) {
            record.status = ExecutionAttemptStatus.COMPLETED;
            record.completedAt = Date.now();
            record.result = result;
        }
    }
    markAttemptFailed(taskId, executionAttempt, error) {
        const key = this.makeKey(taskId, executionAttempt);
        const record = this.attempts.get(key);
        if (record) {
            record.status = ExecutionAttemptStatus.FAILED;
            record.completedAt = Date.now();
            record.error = error;
        }
    }
    getAttempt(taskId, executionAttempt) {
        return this.attempts.get(this.makeKey(taskId, executionAttempt));
    }
    clear() {
        this.attempts.clear();
    }
}
