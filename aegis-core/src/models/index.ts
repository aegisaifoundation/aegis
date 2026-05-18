import { Ollama } from 'ollama';
import { config } from '../config/index.js';

const ollama = new Ollama({ host: config.OLLAMA_HOST });

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class ModelHandler {
  async checkModelAvailability(): Promise<boolean> {
    try {
      const response = await ollama.list();
      return response.models.some(m => m.name.includes(config.MODEL_NAME));
    } catch (error) {
      console.error('Ollama connection error:', error);
      return false;
    }
  }

  async *streamChat(messages: ChatMessage[]) {
    try {
      const response = await ollama.chat({
        model: config.MODEL_NAME,
        messages: messages,
        stream: true,
      });

      for await (const part of response) {
        yield part.message.content;
      }
    } catch (error: any) {
      yield `\n[Error communicating with model: ${error.message}]\n`;
    }
  }

  async generate(prompt: string): Promise<string> {
    try {
      const response = await ollama.generate({
        model: config.MODEL_NAME,
        prompt,
      });
      return response.response;
    } catch (error: any) {
      return `Error: ${error.message}`;
    }
  }
}

export const modelHandler = new ModelHandler();
