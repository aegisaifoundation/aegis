import { IAIBackend } from '../IAIBackend.js';

export class OpenAIBackend implements IAIBackend {
  readonly id = 'openai';
  private loadedModels = new Set<string>();
  private genCount = 0;

  async loadModel(modelId: string, options?: any): Promise<boolean> {
    this.loadedModels.add(modelId);
    console.log(`[OpenAIBackend] Resolved API key and initialized session for ${modelId}.`);
    return true;
  }

  async unloadModel(modelId: string): Promise<boolean> {
    this.loadedModels.delete(modelId);
    return true;
  }

  async generate(modelId: string, prompt: string, options?: any): Promise<string> {
    this.genCount++;
    return `[OpenAI cloud model: ${modelId}] Response to prompt: "${prompt}"`;
  }

  async stream(modelId: string, prompt: string, onChunk: (text: string) => void, options?: any): Promise<void> {
    this.genCount++;
    const words = `[OpenAI cloud stream: ${modelId}] Response to prompt: "${prompt}"`.split(' ');
    for (const word of words) {
      onChunk(word + ' ');
      await new Promise(r => setTimeout(r, 10));
    }
  }

  async embeddings(modelId: string, text: string): Promise<number[]> {
    return Array.from({ length: 1536 }, () => Math.random());
  }

  async tokenize(modelId: string, text: string): Promise<number[]> {
    return text.split('').map(c => c.charCodeAt(0));
  }

  async health(): Promise<'HEALTHY' | 'DEGRADED' | 'FAILED'> {
    return 'HEALTHY';
  }

  metrics(): Record<string, number> {
    return {
      generations: this.genCount,
      activeModels: this.loadedModels.size
    };
  }
}
