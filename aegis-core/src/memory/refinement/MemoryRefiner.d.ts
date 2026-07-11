import { IMemoryRefiner } from '../interfaces/IMemoryRefiner.js';
import { Message } from '../../types/Message.js';
export declare class MemoryRefiner implements IMemoryRefiner {
    /**
     * Refines the session memory by extracting user goals, preferences, and facts,
     * deduplicating data, ranking importance, and enforcing size constraints.
     */
    refineSessionMemory(sessionId: string, history: Message[], currentSessionMemory: string): Promise<string>;
    /**
     * Refines working memory by pruning completed tasks, intermediate reasoning,
     * and stale execution state.
     */
    refineWorkingMemory(sessionId: string, currentWorkingMemory: string): Promise<string>;
    /**
     * Helper to parse markdown into heading-based sections.
     */
    private parseMarkdownSections;
    /**
     * Helper to reconstruct sections back into formatted markdown.
     */
    private reconstructMarkdown;
    /**
     * Enforces word count limits strictly.
     */
    private enforceWordLimit;
    /**
     * Refines task memory by pruning completed tasks.
     */
    refineTaskMemory(sessionId: string, currentTaskMemory: string): Promise<string>;
}
