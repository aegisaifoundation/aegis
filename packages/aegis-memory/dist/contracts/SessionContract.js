import { MemoryContract } from './MemoryContract.js';
export class SessionContract extends MemoryContract {
    /**
     * Validates refined session memory content.
     * Ensures it is within the configured word limit (default 1000 words).
     */
    static validateContent(content, wordLimit = 1000) {
        if (typeof content !== 'string') {
            throw new Error('Session memory content must be a string.');
        }
        const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
        if (wordCount > wordLimit) {
            throw new Error(`Session memory exceeds limit: ${wordCount}/${wordLimit} words.`);
        }
    }
}
