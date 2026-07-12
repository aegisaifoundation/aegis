import { Ollama } from 'ollama';
import { config } from '@aegis/runtime';
export class MemoryEmbeddingManager {
    static instance = new MemoryEmbeddingManager();
    cache = new Map();
    ollama = null;
    modelName = 'nomic-embed-text';
    static getInstance() {
        return this.instance;
    }
    constructor() {
        const host = config.OLLAMA_HOST || 'http://127.0.0.1:11434';
        try {
            this.ollama = new Ollama({ host });
        }
        catch {
            this.ollama = null;
        }
    }
    async generate(text) {
        if (!text) {
            return new Array(768).fill(0);
        }
        if (this.cache.has(text)) {
            return this.cache.get(text);
        }
        try {
            if (this.ollama) {
                const response = await this.ollama.embeddings({
                    model: this.modelName,
                    prompt: text,
                });
                if (response && response.embedding) {
                    const vector = response.embedding;
                    this.cache.set(text, vector);
                    return vector;
                }
            }
        }
        catch (err) {
            // Fallback on connection errors
        }
        const mockVector = this.generateMockEmbedding(text);
        this.cache.set(text, mockVector);
        return mockVector;
    }
    async generateBatch(texts) {
        const results = [];
        for (const text of texts) {
            results.push(await this.generate(text));
        }
        return results;
    }
    generateMockEmbedding(text, dimensions = 768) {
        const vector = new Array(dimensions).fill(0);
        const tokens = text.toLowerCase().split(/\s+/).filter(Boolean);
        for (const token of tokens) {
            let hash = 0;
            for (let i = 0; i < token.length; i++) {
                hash = (hash << 5) - hash + token.charCodeAt(i);
                hash |= 0;
            }
            for (let j = 0; j < 3; j++) {
                const index = Math.abs(hash + j * 31) % dimensions;
                vector[index] += 1;
            }
        }
        let sum = 0;
        for (let val of vector) {
            sum += val * val;
        }
        const norm = Math.sqrt(sum) || 1.0;
        return vector.map(val => val / norm);
    }
}
export const memoryEmbeddingManager = MemoryEmbeddingManager.getInstance();
