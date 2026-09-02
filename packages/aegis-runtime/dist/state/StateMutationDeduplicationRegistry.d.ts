export declare class StateMutationDeduplicationRegistry {
    private readonly maxEntries;
    private readonly ttlMs;
    private seenMutations;
    constructor(maxEntries?: number, ttlMs?: number);
    isDuplicate(mutationId: string): boolean;
    register(mutationId: string): void;
    clear(): void;
}
