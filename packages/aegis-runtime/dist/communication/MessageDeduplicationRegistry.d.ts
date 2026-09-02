export declare class MessageDeduplicationRegistry {
    private entries;
    private readonly maxEntries;
    constructor(maxEntries?: number);
    private makeKey;
    isDuplicate(senderNodeId: string, messageId: string): boolean;
    register(senderNodeId: string, messageId: string, ttlMs?: number): void;
    cleanupExpiredEntries(): void;
    getSize(): number;
    clear(): void;
}
