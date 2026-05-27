import { memoryGateway } from './MemoryGateway.js';
export class ProjectionGenerator {
    static MAX_WORKING_WORDS = 1000;
    static MAX_SESSION_WORDS = 1500;
    /**
     * Generates working-memory.md projection from SessionState.
     */
    generateWorkingMemoryProjection(state) {
        const lines = [];
        lines.push('## Current Objective');
        lines.push(state.currentObjective || 'None');
        lines.push('');
        lines.push('## Active Tasks');
        if (state.activeTasks && state.activeTasks.length > 0) {
            for (const task of state.activeTasks) {
                lines.push(`- ${task}`);
            }
        }
        else {
            lines.push('None');
        }
        lines.push('');
        lines.push('## Immediate Execution Context');
        lines.push(state.currentObjective ? `Focused on objective: ${state.currentObjective}` : 'None');
        lines.push('');
        lines.push('## Temporary Execution Context');
        const tempContext = state.temporaryExecutionContext || {};
        const keys = Object.keys(tempContext);
        if (keys.length > 0) {
            for (const key of keys) {
                const val = typeof tempContext[key] === 'object' ? JSON.stringify(tempContext[key]) : String(tempContext[key]);
                lines.push(`- **${key}**: ${val}`);
            }
        }
        else {
            lines.push('None');
        }
        lines.push('');
        const content = lines.join('\n');
        return this.trimProjection(content, ProjectionGenerator.MAX_WORKING_WORDS);
    }
    /**
     * Generates session-memory.md projection from SessionState.
     */
    generateSessionMemoryProjection(state) {
        const lines = [];
        lines.push('## Goals');
        lines.push(state.currentObjective ? `- **Current Goal**: ${state.currentObjective}` : 'None');
        lines.push('');
        lines.push('## Preferences');
        const prefs = state.preferences || {};
        const keys = Object.keys(prefs);
        if (keys.length > 0) {
            for (const key of keys) {
                const val = typeof prefs[key] === 'object' ? JSON.stringify(prefs[key]) : String(prefs[key]);
                lines.push(`- **${key}**: ${val}`);
            }
        }
        else {
            lines.push('None');
        }
        lines.push('');
        lines.push('## Stable Facts');
        const facts = state.stableFacts || [];
        if (facts.length > 0) {
            for (const fact of facts) {
                lines.push(`- ${fact}`);
            }
        }
        else {
            lines.push('None');
        }
        lines.push('');
        const content = lines.join('\n');
        return this.trimProjection(content, ProjectionGenerator.MAX_SESSION_WORDS);
    }
    /**
     * Projects session state to markdown files. Writes using MemoryGateway.
     */
    async projectSessionState(sessionId, state, txId, actor = 'system') {
        const currentState = state || await memoryGateway.getSessionState(sessionId, actor);
        const workingProj = this.generateWorkingMemoryProjection(currentState);
        const sessionProj = this.generateSessionMemoryProjection(currentState);
        await memoryGateway.updateWorkingMemory(sessionId, workingProj, txId, actor);
        await memoryGateway.updateSessionMemory(sessionId, sessionProj, txId, actor);
    }
    /**
     * Trims content to the word limit.
     */
    trimProjection(content, maxWords) {
        if (this.validateProjectionSize(content, maxWords)) {
            return content;
        }
        const words = content.trim().split(/\s+/);
        return words.slice(0, maxWords).join(' ') + '\n\n... [TRUNCATED DUE TO TOKEN BUDGET LIMIT]';
    }
    /**
     * Formats a summary of the projection.
     */
    summarizeProjection(content) {
        const lines = content.split('\n');
        const headersAndLists = lines.filter(l => l.trim().startsWith('##') || l.trim().startsWith('-'));
        return headersAndLists.join('\n');
    }
    /**
     * Validates if the content fits in the word budget.
     */
    validateProjectionSize(content, maxWords) {
        const words = content.trim().split(/\s+/).filter(Boolean);
        return words.length <= maxWords;
    }
}
export const projectionGenerator = new ProjectionGenerator();
