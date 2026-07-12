import { MemoryContract } from './MemoryContract.js';
export declare class SessionContract extends MemoryContract {
    /**
     * Validates refined session memory content.
     * Ensures it is within the configured word limit (default 1000 words).
     */
    static validateContent(content: string, wordLimit?: number): void;
}
