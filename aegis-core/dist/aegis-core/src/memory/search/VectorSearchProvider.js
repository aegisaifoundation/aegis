import fs from 'fs';
import path from 'path';
import { workspaceManager } from '../../runtime/WorkspaceManager.js';
export class VectorSearchProvider {
    static instance = new VectorSearchProvider();
    documents = [];
    isLoaded = false;
    static getInstance() {
        return this.instance;
    }
    getDatabasePath() {
        const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
        return path.resolve(wsRoot, 'memory/embeddings/vectors.json');
    }
    async load() {
        if (this.isLoaded)
            return;
        try {
            const dbPath = this.getDatabasePath();
            if (fs.existsSync(dbPath)) {
                const raw = await fs.promises.readFile(dbPath, 'utf8');
                this.documents = JSON.parse(raw);
            }
        }
        catch (err) {
            console.error('[VectorSearchProvider] Failed to load vector database:', err);
            this.documents = [];
        }
        this.isLoaded = true;
    }
    async save() {
        try {
            const dbPath = this.getDatabasePath();
            const dir = path.dirname(dbPath);
            if (!fs.existsSync(dir)) {
                await fs.promises.mkdir(dir, { recursive: true });
            }
            const tempPath = `${dbPath}.tmp`;
            await fs.promises.writeFile(tempPath, JSON.stringify(this.documents, null, 2), 'utf8');
            await fs.promises.rename(tempPath, dbPath);
        }
        catch (err) {
            console.error('[VectorSearchProvider] Failed to save vector database:', err);
        }
    }
    async insert(id, sessionId, text, vector, metadata = {}) {
        await this.load();
        const existingIndex = this.documents.findIndex(doc => doc.id === id);
        const newDoc = {
            id,
            sessionId,
            text,
            vector,
            metadata,
            timestamp: new Date().toISOString()
        };
        if (existingIndex >= 0) {
            this.documents[existingIndex] = newDoc;
        }
        else {
            this.documents.push(newDoc);
        }
        await this.save();
    }
    async deleteSession(sessionId) {
        await this.load();
        this.documents = this.documents.filter(doc => doc.sessionId !== sessionId);
        await this.save();
    }
    async query(sessionId, queryVector, limit = 5, minSimilarity = 0.0) {
        await this.load();
        const sessionDocs = this.documents.filter(doc => doc.sessionId === sessionId);
        const scored = sessionDocs.map(doc => {
            const similarity = this.cosineSimilarity(queryVector, doc.vector);
            return { document: doc, similarity };
        });
        return scored
            .filter(item => item.similarity >= minSimilarity)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit);
    }
    cosineSimilarity(vecA, vecB) {
        if (vecA.length !== vecB.length)
            return 0;
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
        return magnitude === 0 ? 0 : dotProduct / magnitude;
    }
}
export const vectorSearchProvider = VectorSearchProvider.getInstance();
