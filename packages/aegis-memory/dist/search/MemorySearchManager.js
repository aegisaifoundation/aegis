import { memoryEmbeddingManager } from '../embedding/MemoryEmbeddingManager.js';
import { vectorSearchProvider } from './VectorSearchProvider.js';
export class MemorySearchManager {
    static instance = new MemorySearchManager();
    static getInstance() {
        return this.instance;
    }
    async search(sessionId, queryText, limit = 5) {
        if (!queryText)
            return [];
        // 1. Generate query embedding
        const queryVector = await memoryEmbeddingManager.generate(queryText);
        // 2. Query vector store
        const vectorResults = await vectorSearchProvider.query(sessionId, queryVector, limit * 2);
        // 3. Compute hybrid scores
        const results = [];
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
    calculateKeywordScore(query, text) {
        const qTokens = query.toLowerCase().split(/\s+/).filter(Boolean);
        const tTokens = text.toLowerCase().split(/\s+/).filter(Boolean);
        if (qTokens.length === 0)
            return 0;
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
