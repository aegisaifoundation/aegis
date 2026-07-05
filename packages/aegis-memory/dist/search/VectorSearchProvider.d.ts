export interface VectorDocument {
    id: string;
    sessionId: string;
    text: string;
    vector: number[];
    metadata: Record<string, any>;
    timestamp: string;
}
export declare class VectorSearchProvider {
    private static instance;
    private documents;
    private isLoaded;
    static getInstance(): VectorSearchProvider;
    private getDatabasePath;
    load(): Promise<void>;
    save(): Promise<void>;
    insert(id: string, sessionId: string, text: string, vector: number[], metadata?: Record<string, any>): Promise<void>;
    deleteSession(sessionId: string): Promise<void>;
    query(sessionId: string, queryVector: number[], limit?: number, minSimilarity?: number): Promise<Array<{
        document: VectorDocument;
        similarity: number;
    }>>;
    private cosineSimilarity;
}
export declare const vectorSearchProvider: VectorSearchProvider;
