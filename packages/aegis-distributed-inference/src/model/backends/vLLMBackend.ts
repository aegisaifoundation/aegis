import { IAIBackend } from '../IAIBackend.js';

export class vLLMBackend implements IAIBackend {
  readonly id = 'vllm';
  async loadModel(modelId: string): Promise<boolean> { return true; }
  async unloadModel(modelId: string): Promise<boolean> { return true; }
  async generate(modelId: string, prompt: string): Promise<string> {
    return `[vLLM model: ${modelId}] Response: "${prompt}"`;
  }
  async stream(modelId: string, prompt: string, onChunk: (text: string) => void): Promise<void> {
    onChunk(`[vLLM model stream: ${modelId}] Response: "${prompt}"`);
  }
  async embeddings(modelId: string, text: string): Promise<number[]> { return [1.0]; }
  async tokenize(modelId: string, text: string): Promise<number[]> { return [1]; }
  async health(): Promise<'HEALTHY'> { return 'HEALTHY'; }
  metrics(): Record<string, number> { return {}; }
}
