import { CoordinationError, CoordinationErrorCode } from '@aegis/sdk';
import { TaskExecutionRegistry } from './TaskExecutionRegistry.js';
export class TaskWorkerRuntime {
    localNodeId;
    maxConcurrentTasks;
    maxQueuedTasks;
    handlers = new Map();
    executionRegistry = new TaskExecutionRegistry();
    activeExecutions = new Map();
    activeCount = 0;
    constructor(localNodeId, maxConcurrentTasks = 5, maxQueuedTasks = 20) {
        this.localNodeId = localNodeId;
        this.maxConcurrentTasks = maxConcurrentTasks;
        this.maxQueuedTasks = maxQueuedTasks;
    }
    registerTaskHandler(taskType, handler) {
        this.handlers.set(taskType, handler);
        console.log(`[TaskWorkerRuntime] Task handler registered for type "${taskType}".`);
    }
    unregisterTaskHandler(taskType) {
        this.handlers.delete(taskType);
    }
    getActiveCount() {
        return this.activeCount;
    }
    canAcceptTask(task) {
        if (this.activeCount >= this.maxConcurrentTasks) {
            return { canAccept: false, reason: `CAPACITY_EXCEEDED: Active tasks (${this.activeCount}) reached maxConcurrentTasks (${this.maxConcurrentTasks}).` };
        }
        const handler = this.handlers.get(task.type);
        if (!handler) {
            return { canAccept: false, reason: `TASK_NOT_SUPPORTED: No handler registered for task type "${task.type}".` };
        }
        if (this.executionRegistry.isAttemptRecorded(task.taskId, task.executionAttempt)) {
            return { canAccept: false, reason: `TASK_DUPLICATE_EXECUTION: Attempt ${task.executionAttempt} for task "${task.taskId}" already recorded.` };
        }
        return { canAccept: true };
    }
    async executeTask(task, onProgress) {
        const acceptance = this.canAcceptTask(task);
        if (!acceptance.canAccept) {
            throw new CoordinationError(CoordinationErrorCode.TASK_REJECTED, acceptance.reason || 'Task execution rejected.');
        }
        const handler = this.handlers.get(task.type);
        this.executionRegistry.registerAttemptStart(task.taskId, task.executionAttempt);
        const execKey = `${task.taskId}:${task.executionAttempt}`;
        this.activeCount++;
        this.activeExecutions.set(execKey, { task });
        try {
            const result = await handler(task, (fraction, message) => {
                if (onProgress) {
                    onProgress(fraction, message);
                }
            });
            this.executionRegistry.markAttemptCompleted(task.taskId, task.executionAttempt, result);
            return {
                taskId: task.taskId,
                executionAttempt: task.executionAttempt,
                workerNodeId: this.localNodeId,
                status: 'COMPLETED',
                result,
                completedAt: Date.now()
            };
        }
        catch (err) {
            this.executionRegistry.markAttemptFailed(task.taskId, task.executionAttempt, err);
            return {
                taskId: task.taskId,
                executionAttempt: task.executionAttempt,
                workerNodeId: this.localNodeId,
                status: 'FAILED',
                error: {
                    code: err.code || 'TASK_EXECUTION_FAILED',
                    message: err.message
                },
                completedAt: Date.now()
            };
        }
        finally {
            this.activeCount--;
            this.activeExecutions.delete(execKey);
        }
    }
    cancelTask(taskId) {
        for (const [key, item] of this.activeExecutions.entries()) {
            if (item.task.taskId === taskId) {
                if (item.cancel) {
                    item.cancel();
                }
                this.activeExecutions.delete(key);
                return true;
            }
        }
        return false;
    }
}
