export class StateMutationDeduplicationRegistry {
  private seenMutations = new Map<string, number>();

  constructor(private readonly maxEntries: number = 10000, private readonly ttlMs: number = 3600000) {}

  isDuplicate(mutationId: string): boolean {
    const timestamp = this.seenMutations.get(mutationId);
    if (!timestamp) return false;
    if (Date.now() - timestamp > this.ttlMs) {
      this.seenMutations.delete(mutationId);
      return false;
    }
    return true;
  }

  register(mutationId: string): void {
    if (this.seenMutations.size >= this.maxEntries) {
      const oldestKey = this.seenMutations.keys().next().value;
      if (oldestKey) this.seenMutations.delete(oldestKey);
    }
    this.seenMutations.set(mutationId, Date.now());
  }

  clear(): void {
    this.seenMutations.clear();
  }
}
