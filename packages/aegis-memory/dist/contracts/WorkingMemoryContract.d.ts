import { MemoryContract } from './MemoryContract.js';
export declare class WorkingMemoryContract extends MemoryContract {
    /**
     * Validates active working memory content.
     * Ensures it is within the configured word limit (default 1500 words).
     */
    static validateContent(content: string, wordLimit?: number): void;
}
