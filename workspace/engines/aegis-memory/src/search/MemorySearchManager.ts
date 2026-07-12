import { memoryEmbeddingManager } from '../embedding/MemoryEmbeddingManager.js';
import { vectorSearchProvider, VectorDocument } from './VectorSearchProvider.js';

export interface SearchResult {
  score: number;
  text: string;
  metadata: Record<string, any>;
  timestamp: string;
}

export class MemorySearchManager {
  private static instance = new MemorySearchManager();

  public static getInstance(): MemorySearchManager {
    return this.instance;
  }

  public async search(
    sessionId: string,
    queryText: string,
    limit = 5
  ): Promise<SearchResult[]> {
    if (!queryText) return [];

    // 1. Generate query embedding
    const queryVector = await memoryEmbeddingManager.generate(queryText);

    // 2. Query vector store
    const vectorResults = await vectorSearchProvider.query(sessionId, queryVector, limit * 2);

    // 3. Compute hybrid scores
    const results: SearchResult[] = [];
    for (const item of vectorResults) {
      const semanticScore = item.similarity;
      const keywordScore = this.calculateKeywordScore(queryText, item.document.text);
      const hybridScore = 0.7 * semanticScore + 0.3 * keywordScore;

      results.push({
        score: hybridScore,
        text: item.document.text,
        metadata: item.document.metadata,
        timestamp: item.document.timestamp
      });
    }

    // Sort by hybrid score descending
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  private calculateKeywordScore(query: string, text: string): number {
    const qTokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    const tTokens = text.toLowerCase().split(/\s+/).filter(Boolean);
    if (qTokens.length === 0) return 0;

    let matches = 0;
    for (const q of qTokens) {
      if (tTokens.includes(q) || text.toLowerCase().includes(q)) {
        matches++;
      }
    }
    return matches / qTokens.length;
  }
}

export const memorySearchManager = MemorySearchManager.getInstance();
