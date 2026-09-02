export class StateMutationDeduplicationRegistry {
    maxEntries;
    ttlMs;
    seenMutations = new Map();
    constructor(maxEntries = 10000, ttlMs = 3600000) {
        this.maxEntries = maxEntries;
        this.ttlMs = ttlMs;
    }
    isDuplicate(mutationId) {
        const timestamp = this.seenMutations.get(mutationId);
        if (!timestamp)
            return false;
        if (Date.now() - timestamp > this.ttlMs) {
            this.seenMutations.delete(mutationId);
            return false;
        }
        return true;
    }
    register(mutationId) {
        if (this.seenMutations.size >= this.maxEntries) {
            const oldestKey = this.seenMutations.keys().next().value;
            if (oldestKey)
                this.seenMutations.delete(oldestKey);
        }
        this.seenMutations.set(mutationId, Date.now());
    }
    clear() {
        this.seenMutations.clear();
    }
}
