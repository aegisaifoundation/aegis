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
    static getInstance(): VectorSearchProvider;
    private getDatabasePath;
    load(sessionId: string): Promise<VectorDocument[]>;
    save(sessionId: string, documents: VectorDocument[]): Promise<void>;
    insert(id: string, sessionId: string, text: string, vector: number[], metadata?: Record<string, any>): Promise<void>;
    deleteSession(sessionId: string): Promise<void>;
    query(sessionId: string, queryVector: number[], limit?: number, minSimilarity?: number): Promise<Array<{
        document: VectorDocument;
        similarity: number;
    }>>;
    private cosineSimilarity;
}
export declare const vectorSearchProvider: VectorSearchProvider;
