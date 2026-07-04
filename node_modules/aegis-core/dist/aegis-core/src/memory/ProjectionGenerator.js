import { memoryGateway } from './MemoryGateway.js';
import { toolRegistry } from '../tools/index.js';
import { skillRegistry } from '../skills/index.js';
import { calculateChecksum } from './utils/MemoryFileHelpers.js';
export class ProjectionGenerator {
    static MAX_WORKING_WORDS = 1000;
    static MAX_SESSION_WORDS = 1000;
    // ── Per-session projection content hash cache ─────────────────
    /** Tracks the last-written content hash of each projection per session. */
    projectionHashes = new Map();
    // ── Static section caches (tool/skill list strings) ───────────
    /** Cached tool list section — invalidated when tools change. */
    cachedToolSection = null;
    /** Cached skill list section — invalidated when skills change. */
    cachedSkillSection = null;
    // ── Cache invalidation ────────────────────────────────────────
    invalidateToolCache() {
        this.cachedToolSection = null;
    }
    invalidateSkillCache() {
        this.cachedSkillSection = null;
    }
    invalidateProjectionHashes(sessionId) {
        this.projectionHashes.delete(sessionId);
    }
    // ── Section builders ──────────────────────────────────────────
    buildToolSection() {
        if (this.cachedToolSection !== null)
            return this.cachedToolSection;
        const tools = toolRegistry.getAllTools();
        const lines = ['available tools:'];
        if (tools.length > 0) {
            for (const tool of tools)
                lines.push(`- ${tool.name}`);
        }
        else {
            lines.push('- None');
        }
        lines.push('');
        this.cachedToolSection = lines.join('\n');
        return this.cachedToolSection;
    }
    buildSkillSection() {
        if (this.cachedSkillSection !== null)
            return this.cachedSkillSection;
        const skills = skillRegistry.list();
        const lines = ['available skills:'];
        if (skills.length > 0) {
            for (const skill of skills) {
                const suffix = skill.name.toLowerCase().endsWith('skill') ? '' : ' skill';
                lines.push(`- ${skill.name}${suffix}`);
            }
        }
        else {
            lines.push('- None');
        }
        lines.push('');
        this.cachedSkillSection = lines.join('\n');
        return this.cachedSkillSection;
    }
    // ── Projection generators ─────────────────────────────────────
    /**
     * Generates working-memory.md projection from SessionState.
     */
    generateWorkingMemoryProjection(state) {
        const lines = [];
        // Header section
        lines.push(`- goal: ${state.goal || state.currentObjective || 'None'}`);
        lines.push(`- current objective: ${state.currentObjective || 'None'}`);
        lines.push('');
        // Cached static sections
        lines.push(this.buildToolSection());
        lines.push(this.buildSkillSection());
        // Temporary execution context
        const tempContext = state.temporaryExecutionContext || {};
        const keys = Object.keys(tempContext);
        if (keys.length > 0) {
            lines.push('## Temporary Execution Context');
            for (const key of keys) {
                const val = typeof tempContext[key] === 'object' ? JSON.stringify(tempContext[key]) : String(tempContext[key]);
                lines.push(`- **${key}**: ${val}`);
            }
            lines.push('');
        }
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
            for (const fact of facts)
                lines.push(`- ${fact}`);
        }
        else {
            lines.push('None');
        }
        lines.push('');
        const content = lines.join('\n');
        return this.trimProjection(content, ProjectionGenerator.MAX_SESSION_WORDS);
    }
    /**
     * Generates task.md projection from SessionState.
     */
    generateTaskProjection(state) {
        const lines = [];
        lines.push('# Tasks');
        lines.push('');
        const tasksList = state.tasks || [];
        if (tasksList.length > 0) {
            for (const task of tasksList) {
                const cleanTask = task.replace(/^-\s+/, '').replace(/^\[[\s\S]*?\]\s*/, '');
                lines.push(`- ${cleanTask}`);
            }
        }
        else {
            lines.push('- None');
        }
        lines.push('');
        lines.push('# Active Tasks');
        lines.push('');
        if (state.activeTasks && state.activeTasks.length > 0) {
            for (const task of state.activeTasks) {
                const hasPrefix = /^\[[!✓✗\s]\]/.test(task);
                if (hasPrefix) {
                    lines.push(task);
                }
                else {
                    lines.push(`[ ] ${task}`);
                }
            }
        }
        else {
            lines.push('None');
        }
        lines.push('');
        return lines.join('\n');
    }
    /**
     * Projects session state to markdown files.
     * Skips writing a file when its content hash hasn't changed (dirty-aware).
     */
    async projectSessionState(sessionId, state, txId, actor = 'system') {
        const currentState = state || await memoryGateway.getSessionState(sessionId, actor);
        const workingProj = this.generateWorkingMemoryProjection(currentState);
        const sessionProj = this.generateSessionMemoryProjection(currentState);
        const taskProj = this.generateTaskProjection(currentState);
        const hashes = this.projectionHashes.get(sessionId) ?? { working: '', session: '', task: '' };
        const newWorkingHash = calculateChecksum(workingProj);
        const newSessionHash = calculateChecksum(sessionProj);
        const newTaskHash = calculateChecksum(taskProj);
        // Only write projections whose content actually changed
        const writes = [];
        if (newWorkingHash !== hashes.working) {
            writes.push(memoryGateway.updateWorkingMemory(sessionId, workingProj, txId, actor));
            hashes.working = newWorkingHash;
        }
        if (newSessionHash !== hashes.session) {
            writes.push(memoryGateway.updateSessionMemory(sessionId, sessionProj, txId, actor));
            hashes.session = newSessionHash;
        }
        if (newTaskHash !== hashes.task) {
            writes.push(memoryGateway.updateTask(sessionId, taskProj, txId, actor));
            hashes.task = newTaskHash;
        }
        if (writes.length > 0) {
            await Promise.all(writes);
            this.projectionHashes.set(sessionId, hashes);
        }
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
