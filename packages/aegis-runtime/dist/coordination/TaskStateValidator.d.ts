import { TaskState } from '@aegis/sdk';
export declare class TaskStateValidator {
    private static allowedMap;
    private static getAllowedMap;
    static validateTransition(taskId: string, currentState: TaskState, targetState: TaskState): void;
    static canTransition(currentState: TaskState, targetState: TaskState): boolean;
}
