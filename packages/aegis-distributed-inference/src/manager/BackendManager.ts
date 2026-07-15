import { IAIBackend } from '../model/IAIBackend.js';
import { LlamaCppBackend } from '../model/backends/LlamaCppBackend.js';
import { OllamaBackend } from '../model/backends/OllamaBackend.js';
import { OpenAIBackend } from '../model/backends/OpenAIBackend.js';
import { vLLMBackend } from '../model/backends/vLLMBackend.js';
import { TensorRTBackend } from '../model/backends/TensorRTBackend.js';
import { OnnxBackend } from '../model/backends/OnnxBackend.js';
import { HuggingFaceBackend } from '../model/backends/HuggingFaceBackend.js';

export class BackendManager {
  private backends = new Map<string, IAIBackend>();

  constructor() {
    // Automatically register all core backends
    this.registerBackend(new LlamaCppBackend());
    this.registerBackend(new OllamaBackend());
    this.registerBackend(new OpenAIBackend());
    this.registerBackend(new vLLMBackend());
    this.registerBackend(new TensorRTBackend());
    this.registerBackend(new OnnxBackend());
    this.registerBackend(new HuggingFaceBackend());
  }

  registerBackend(backend: IAIBackend): void {
    this.backends.set(backend.id, backend);
    console.log(`[BackendManager] Registered AI backend: ${backend.id}`);
  }

  getBackend(backendId: string): IAIBackend | undefined {
    return this.backends.get(backendId);
  }

  listBackends(): IAIBackend[] {
    return Array.from(this.backends.values());
  }

  unloadBackend(backendId: string): void {
    this.backends.delete(backendId);
  }

  /**
   * Automatically select the best backend based on model capabilities and system state.
   */
  selectOptimalBackend(modelId: string, allowedLocations: ('LOCAL' | 'REMOTE' | 'DISTRIBUTED')[]): string {
    // Default matching logic
    if (modelId.startsWith('gpt') && allowedLocations.includes('REMOTE')) {
      return 'openai';
    }

    if (allowedLocations.includes('LOCAL')) {
      // Prefer Ollama if available, fallback to llama.cpp
      if (this.backends.has('ollama')) return 'ollama';
      return 'llama.cpp';
    }

    throw new Error(`[BackendManager] No optimal backend found for model ${modelId} under constraints: ${allowedLocations.join(', ')}`);
  }
}
