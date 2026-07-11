import { SessionState } from './interfaces/MemoryTypes.js';
export declare class ProjectionGenerator {
    static readonly MAX_WORKING_WORDS = 1000;
    static readonly MAX_SESSION_WORDS = 1000;
    /** Tracks the last-written content hash of each projection per session. */
    private projectionHashes;
    /** Cached tool list section — invalidated when tools change. */
    private cachedToolSection;
    /** Cached skill list section — invalidated when skills change. */
    private cachedSkillSection;
    invalidateToolCache(): void;
    invalidateSkillCache(): void;
    invalidateProjectionHashes(sessionId: string): void;
    private buildToolSection;
    private buildSkillSection;
    /**
     * Generates working-memory.md projection from SessionState.
     */
    generateWorkingMemoryProjection(state: SessionState): string;
    /**
     * Generates session-memory.md projection from SessionState.
     */
    generateSessionMemoryProjection(state: SessionState): string;
    /**
     * Generates task.md projection from SessionState.
     */
    generateTaskProjection(state: SessionState): string;
    /**
     * Projects session state to markdown files.
     * Skips writing a file when its content hash hasn't changed (dirty-aware).
     */
    projectSessionState(sessionId: string, state?: SessionState, txId?: string, actor?: string): Promise<void>;
    /**
     * Trims content to the word limit.
     */
    trimProjection(content: string, maxWords: number): string;
    /**
     * Formats a summary of the projection.
     */
    summarizeProjection(content: string): string;
    /**
     * Validates if the content fits in the word budget.
     */
    validateProjectionSize(content: string, maxWords: number): boolean;
}
export declare const projectionGenerator: ProjectionGenerator;
