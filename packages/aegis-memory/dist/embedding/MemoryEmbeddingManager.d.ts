export declare class MemoryEmbeddingManager {
    private static instance;
    private cache;
    private ollama;
    private modelName;
    static getInstance(): MemoryEmbeddingManager;
    constructor();
    generate(text: string): Promise<number[]>;
    generateBatch(texts: string[]): Promise<number[][]>;
    private generateMockEmbedding;
}
export declare const memoryEmbeddingManager: MemoryEmbeddingManager;
