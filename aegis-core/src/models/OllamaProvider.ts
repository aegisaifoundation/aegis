import { Ollama } from 'ollama';
import { ModelProvider, ChatMessage } from './ModelProvider.js';
import { config } from '../config/index.js';

export class OllamaProvider implements ModelProvider {
  private ollama: Ollama;

  constructor() {
    this.ollama = new Ollama({ host: config.OLLAMA_HOST });
  }

  async checkAvailability(): Promise<boolean> {
    try {
      const response = await this.ollama.list();
      return response.models.some(m => m.name.includes(config.MODEL_NAME));
    } catch (error) {
      console.error('Ollama connection error:', error);
      return false;
    }
  }

  async *streamChat(messages: ChatMessage[]): AsyncGenerator<string> {
    // Map roles to what Ollama expects (system, user, assistant)
    const mappedMessages = messages.map(m => {
      let role: 'system' | 'user' | 'assistant' = 'system';
      if (m.role === 'user') role = 'user';
      if (m.role === 'assistant') role = 'assistant';
      // 'tool' is mapped to 'system'
      return { role, content: m.content };
    });

    const response = await this.ollama.chat({
      model: config.MODEL_NAME,
      messages: mappedMessages,
      stream: true,
    });

    for await (const part of response) {
      yield part.message.content;
    }
  }

  async generate(prompt: string): Promise<string> {
    const response = await this.ollama.generate({
      model: config.MODEL_NAME,
      prompt,
    });
    return response.response;
  }
}
