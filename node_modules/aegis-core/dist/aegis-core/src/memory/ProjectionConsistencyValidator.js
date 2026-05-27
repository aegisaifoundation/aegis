import { projectionGenerator } from './ProjectionGenerator.js';
export class ProjectionConsistencyValidator {
    /**
     * Validates working-memory.md projection against SessionState.
     */
    validateWorkingProjection(content, state) {
        // 1. Validate size constraint
        if (!projectionGenerator.validateProjectionSize(content, 1000)) {
            return { valid: false, reason: 'Working memory projection exceeds token budget (1000 words limit)' };
        }
        // 2. Validate current objective is present
        if (state.currentObjective && !content.includes(state.currentObjective)) {
            return { valid: false, reason: `Objective "${state.currentObjective}" is not present in working memory projection` };
        }
        // 3. Validate active tasks are present
        if (state.activeTasks && state.activeTasks.length > 0) {
            for (const task of state.activeTasks) {
                if (!content.includes(task)) {
                    return { valid: false, reason: `Active task "${task}" is not present in working memory projection` };
                }
            }
        }
        // 4. Validate temporary execution context keys are present
        const tempContext = state.temporaryExecutionContext || {};
        for (const key of Object.keys(tempContext)) {
            if (!content.includes(key)) {
                return { valid: false, reason: `Temporary context key "${key}" is not present in working memory projection` };
            }
        }
        return { valid: true };
    }
    /**
     * Validates session-memory.md projection against SessionState.
     */
    validateSessionProjection(content, state) {
        // 1. Validate size constraint
        if (!projectionGenerator.validateProjectionSize(content, 1500)) {
            return { valid: false, reason: 'Session memory projection exceeds token budget (1500 words limit)' };
        }
        // 2. Validate preferences keys are present
        const prefs = state.preferences || {};
        for (const key of Object.keys(prefs)) {
            if (!content.includes(key)) {
                return { valid: false, reason: `Preference key "${key}" is not present in session memory projection` };
            }
        }
        // 3. Validate stable facts are present
        const facts = state.stableFacts || [];
        for (const fact of facts) {
            if (!content.includes(fact)) {
                return { valid: false, reason: `Stable fact "${fact}" is not present in session memory projection` };
            }
        }
        return { valid: true };
    }
    /**
     * Validates both projections are synchronized with SessionState.
     */
    validateProjectionSynchronization(workingContent, sessionContent, state) {
        const workingRes = this.validateWorkingProjection(workingContent, state);
        if (!workingRes.valid) {
            return workingRes;
        }
        const sessionRes = this.validateSessionProjection(sessionContent, state);
        if (!sessionRes.valid) {
            return sessionRes;
        }
        return { valid: true };
    }
}
export const projectionConsistencyValidator = new ProjectionConsistencyValidator();
