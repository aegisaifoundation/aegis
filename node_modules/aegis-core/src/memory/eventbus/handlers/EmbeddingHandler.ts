import { MemoryEvent } from '../MemoryEvent.js';
import { memoryEmbeddingManager } from '../../embedding/MemoryEmbeddingManager.js';
import { vectorSearchProvider } from '../../search/VectorSearchProvider.js';

export class EmbeddingHandler {
  public static async handleEvent(event: MemoryEvent): Promise<void> {
    const { sessionId, topic, actor, payload } = event;
    const content = payload?.content;
    if (!content || typeof content !== 'string') return;

    try {
      const chunks = this.splitContentIntoChunks(content);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (chunk.trim().length < 5) continue;
        
        const chunkId = `chk_${topic}_${sessionId}_${i}`;
        const vector = await memoryEmbeddingManager.generate(chunk);
        
        await vectorSearchProvider.insert(chunkId, sessionId, chunk, vector, {
          sourceTopic: topic,
          actor,
          chunkIndex: i
        });
      }
    } catch (err) {
      console.error('[EmbeddingHandler] Failed to index memory update:', err);
    }
  }

  private static splitContentIntoChunks(content: string): string[] {
    const lines = content.split('\n');
    const chunks: string[] = [];
    let currentChunk = '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('##') || trimmed.startsWith('#')) {
        if (currentChunk.trim()) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = line + '\n';
      } else if (trimmed) {
        currentChunk += line + '\n';
      }
    }
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }
}
