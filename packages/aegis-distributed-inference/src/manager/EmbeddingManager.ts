import type { BackendManager } from './BackendManager.js';

export class EmbeddingManager {
  private embeddingCache = new Map<string, number[]>();

  constructor(private backendManager: BackendManager) {}

  async getEmbeddings(text: string, modelId = 'gpt-4o', backendId = 'openai'): Promise<number[]> {
    const cacheKey = `${modelId}:${text}`;
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    const backend = this.backendManager.getBackend(backendId);
    if (!backend) {
      throw new Error(`[EmbeddingManager] Selected backend ${backendId} not registered.`);
    }

    const vector = await backend.embeddings(modelId, text);
    this.embeddingCache.set(cacheKey, vector);
    return vector;
  }

  cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return normA > 0 && normB > 0 ? dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)) : 0;
  }
}
