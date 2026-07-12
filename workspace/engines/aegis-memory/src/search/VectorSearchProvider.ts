import fs from 'fs';
import path from 'path';
import { workspaceManager } from '@aegis/runtime';

export interface VectorDocument {
  id: string;
  sessionId: string;
  text: string;
  vector: number[];
  metadata: Record<string, any>;
  timestamp: string;
}

export class VectorSearchProvider {
  private static instance = new VectorSearchProvider();

  public static getInstance(): VectorSearchProvider {
    return this.instance;
  }

  private getDatabasePath(sessionId: string): string {
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    return path.resolve(wsRoot, `memory/sessions/${sessionId}/vectors/vectors.json`);
  }

  public async load(sessionId: string): Promise<VectorDocument[]> {
    try {
      const dbPath = this.getDatabasePath(sessionId);
      if (fs.existsSync(dbPath)) {
        const raw = await fs.promises.readFile(dbPath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error(`[VectorSearchProvider] Failed to load vector database for session ${sessionId}:`, err);
    }
    return [];
  }

  public async save(sessionId: string, documents: VectorDocument[]): Promise<void> {
    try {
      const dbPath = this.getDatabasePath(sessionId);
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }
      const tempPath = `${dbPath}.tmp`;
      await fs.promises.writeFile(tempPath, JSON.stringify(documents, null, 2), 'utf8');
      await fs.promises.rename(tempPath, dbPath);
    } catch (err) {
      console.error(`[VectorSearchProvider] Failed to save vector database for session ${sessionId}:`, err);
    }
  }

  public async insert(
    id: string,
    sessionId: string,
    text: string,
    vector: number[],
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const documents = await this.load(sessionId);
    const existingIndex = documents.findIndex(doc => doc.id === id);
    const newDoc: VectorDocument = {
      id,
      sessionId,
      text,
      vector,
      metadata,
      timestamp: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      documents[existingIndex] = newDoc;
    } else {
      documents.push(newDoc);
    }
    await this.save(sessionId, documents);
  }

  public async deleteSession(sessionId: string): Promise<void> {
    const dbPath = this.getDatabasePath(sessionId);
    if (fs.existsSync(dbPath)) {
      await fs.promises.unlink(dbPath).catch(() => {});
    }
  }

  public async query(
    sessionId: string,
    queryVector: number[],
    limit = 5,
    minSimilarity = 0.0
  ): Promise<Array<{ document: VectorDocument; similarity: number }>> {
    const documents = await this.load(sessionId);

    const scored = documents.map(doc => {
      const similarity = this.cosineSimilarity(queryVector, doc.vector);
      return { document: doc, similarity };
    });

    return scored
      .filter(item => item.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;
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
