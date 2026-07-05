import { SessionState } from './interfaces/MemoryTypes.js';
export declare class ProjectionConsistencyValidator {
    /**
     * Validates working-memory.md projection against SessionState.
     */
    validateWorkingProjection(content: string, state: SessionState): {
        valid: boolean;
        reason?: string;
    };
    /**
     * Validates session-memory.md projection against SessionState.
     */
    validateSessionProjection(content: string, state: SessionState): {
        valid: boolean;
        reason?: string;
    };
    /**
     * Validates task.md projection against SessionState.
     */
    validateTaskProjection(content: string, state: SessionState): {
        valid: boolean;
        reason?: string;
    };
    /**
     * Validates both projections are synchronized with SessionState.
     */
    validateProjectionSynchronization(workingContent: string, sessionContent: string, taskContent: string, state: SessionState): {
        valid: boolean;
        reason?: string;
    };
}
export declare const projectionConsistencyValidator: ProjectionConsistencyValidator;
