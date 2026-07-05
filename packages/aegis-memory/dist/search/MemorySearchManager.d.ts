export interface SearchResult {
    score: number;
    text: string;
    metadata: Record<string, any>;
    timestamp: string;
}
export declare class MemorySearchManager {
    private static instance;
    static getInstance(): MemorySearchManager;
    search(sessionId: string, queryText: string, limit?: number): Promise<SearchResult[]>;
    private calculateKeywordScore;
}
export declare const memorySearchManager: MemorySearchManager;
