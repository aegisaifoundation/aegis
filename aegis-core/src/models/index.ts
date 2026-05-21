import type { ModelProvider, ChatMessage } from './ModelProvider.js';
import { OllamaProvider } from './OllamaProvider.js';

export type { ModelProvider, ChatMessage };

export class ModelHandler {
  private provider: ModelProvider;

  constructor() {
    this.provider = new OllamaProvider();
  }

  setProvider(provider: ModelProvider) {
    this.provider = provider;
  }

  async checkModelAvailability(): Promise<boolean> {
    return this.provider.checkAvailability();
  }

  streamChat(messages: ChatMessage[]): AsyncGenerator<string> {
    return this.provider.streamChat(messages);
  }

  async generate(prompt: string): Promise<string> {
    return this.provider.generate(prompt);
  }
}

export const modelHandler = new ModelHandler();
