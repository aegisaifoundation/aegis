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
  private documents: VectorDocument[] = [];
  private isLoaded = false;

  public static getInstance(): VectorSearchProvider {
    return this.instance;
  }

  private getDatabasePath(): string {
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    return path.resolve(wsRoot, 'memory/embeddings/vectors.json');
  }

  public async load(): Promise<void> {
    if (this.isLoaded) return;
    try {
      const dbPath = this.getDatabasePath();
      if (fs.existsSync(dbPath)) {
        const raw = await fs.promises.readFile(dbPath, 'utf8');
        this.documents = JSON.parse(raw);
      }
    } catch (err) {
      console.error('[VectorSearchProvider] Failed to load vector database:', err);
      this.documents = [];
    }
    this.isLoaded = true;
  }

  public async save(): Promise<void> {
    try {
      const dbPath = this.getDatabasePath();
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }
      const tempPath = `${dbPath}.tmp`;
      await fs.promises.writeFile(tempPath, JSON.stringify(this.documents, null, 2), 'utf8');
      await fs.promises.rename(tempPath, dbPath);
    } catch (err) {
      console.error('[VectorSearchProvider] Failed to save vector database:', err);
    }
  }

  public async insert(
    id: string,
    sessionId: string,
    text: string,
    vector: number[],
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.load();
    const existingIndex = this.documents.findIndex(doc => doc.id === id);
    const newDoc: VectorDocument = {
      id,
      sessionId,
      text,
      vector,
      metadata,
      timestamp: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      this.documents[existingIndex] = newDoc;
    } else {
      this.documents.push(newDoc);
    }
    await this.save();
  }

  public async deleteSession(sessionId: string): Promise<void> {
    await this.load();
    this.documents = this.documents.filter(doc => doc.sessionId !== sessionId);
    await this.save();
  }

  public async query(
    sessionId: string,
    queryVector: number[],
    limit = 5,
    minSimilarity = 0.0
  ): Promise<Array<{ document: VectorDocument; similarity: number }>> {
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
