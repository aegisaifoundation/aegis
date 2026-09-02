import {
  TaskState,
  CoordinationError,
  CoordinationErrorCode
} from '@aegis/sdk';

export class TaskStateValidator {
  private static allowedMap: Map<TaskState, Set<TaskState>> | null = null;

  private static getAllowedMap(): Map<TaskState, Set<TaskState>> {
    if (!this.allowedMap) {
      this.allowedMap = new Map([
        [TaskState.CREATED, new Set([TaskState.QUEUED, TaskState.CANCELLED, TaskState.EXPIRED])],
        [TaskState.QUEUED, new Set([TaskState.SCHEDULING, TaskState.CANCELLED, TaskState.EXPIRED])],
        [TaskState.SCHEDULING, new Set([TaskState.ASSIGNED, TaskState.QUEUED, TaskState.FAILED, TaskState.CANCELLED, TaskState.EXPIRED])],
        [TaskState.ASSIGNED, new Set([TaskState.ACCEPTED, TaskState.QUEUED, TaskState.FAILED, TaskState.CANCELLED, TaskState.EXPIRED])],
        [TaskState.ACCEPTED, new Set([TaskState.RUNNING, TaskState.QUEUED, TaskState.FAILED, TaskState.CANCELLED, TaskState.EXPIRED])],
        [TaskState.RUNNING, new Set([TaskState.COMPLETED, TaskState.FAILED, TaskState.QUEUED, TaskState.CANCELLED, TaskState.EXPIRED])],
        [TaskState.COMPLETED, new Set()],
        [TaskState.FAILED, new Set([TaskState.QUEUED])],
        [TaskState.CANCELLED, new Set()],
        [TaskState.EXPIRED, new Set()]
      ]);
    }
    return this.allowedMap;
  }

  static validateTransition(taskId: string, currentState: TaskState, targetState: TaskState): void {
    if (currentState === targetState) return;

    const allowed = this.getAllowedMap().get(currentState);
    if (!allowed || !allowed.has(targetState)) {
      throw new CoordinationError(
        CoordinationErrorCode.INVALID_TASK_STATE,
        `Invalid task state transition for "${taskId}": Cannot transition from ${currentState} to ${targetState}.`
      );
    }
  }

  static canTransition(currentState: TaskState, targetState: TaskState): boolean {
    if (currentState === targetState) return true;
    const allowed = this.getAllowedMap().get(currentState);
    return allowed ? allowed.has(targetState) : false;
  }
}
