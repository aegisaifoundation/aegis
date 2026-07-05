import { MemoryContract } from './MemoryContract.js';
export class WorkingMemoryContract extends MemoryContract {
    /**
     * Validates active working memory content.
     * Ensures it is within the configured word limit (default 1500 words).
     */
    static validateContent(content, wordLimit = 1500) {
        if (typeof content !== 'string') {
            throw new Error('Working memory content must be a string.');
        }
        const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
        if (wordCount > wordLimit) {
            throw new Error(`Working memory exceeds limit: ${wordCount}/${wordLimit} words.`);
        }
    }
}
