import type { BackendManager } from './BackendManager.js';
export declare class EmbeddingManager {
    private backendManager;
    private embeddingCache;
    constructor(backendManager: BackendManager);
    getEmbeddings(text: string, modelId?: string, backendId?: string): Promise<number[]>;
    cosineSimilarity(vecA: number[], vecB: number[]): number;
}
