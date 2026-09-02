import { CoordinationError, CoordinationErrorCode } from '@aegis/sdk';

export enum ExecutionAttemptStatus {
  STARTED = 'STARTED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
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

export class TaskExecutionRegistry {
  private attempts = new Map<string, ExecutionAttemptRecord>();

  private makeKey(taskId: string, executionAttempt: number): string {
    return `${taskId}:${executionAttempt}`;
  }

  isAttemptRecorded(taskId: string, executionAttempt: number): boolean {
    return this.attempts.has(this.makeKey(taskId, executionAttempt));
  }

  registerAttemptStart(taskId: string, executionAttempt: number): void {
    const key = this.makeKey(taskId, executionAttempt);
    if (this.attempts.has(key)) {
      throw new CoordinationError(
        CoordinationErrorCode.TASK_DUPLICATE_EXECUTION,
        `Execution attempt ${executionAttempt} for task "${taskId}" is already recorded on this node.`
      );
    }

    this.attempts.set(key, {
      taskId,
      executionAttempt,
      status: ExecutionAttemptStatus.STARTED,
      startedAt: Date.now()
    });
  }

  markAttemptCompleted(taskId: string, executionAttempt: number, result: any): void {
    const key = this.makeKey(taskId, executionAttempt);
    const record = this.attempts.get(key);
    if (record) {
      record.status = ExecutionAttemptStatus.COMPLETED;
      record.completedAt = Date.now();
      record.result = result;
    }
  }

  markAttemptFailed(taskId: string, executionAttempt: number, error: any): void {
    const key = this.makeKey(taskId, executionAttempt);
    const record = this.attempts.get(key);
    if (record) {
      record.status = ExecutionAttemptStatus.FAILED;
      record.completedAt = Date.now();
      record.error = error;
    }
  }

  getAttempt(taskId: string, executionAttempt: number): ExecutionAttemptRecord | undefined {
    return this.attempts.get(this.makeKey(taskId, executionAttempt));
  }

  clear(): void {
    this.attempts.clear();
  }
}
