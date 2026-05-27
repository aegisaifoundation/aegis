import { providerManager } from '../providers/index.js';
import { Message } from '../types/Message.js';
import { messageFormatter } from './MessageFormatter.js';

export class Agent {
  async *streamChat(messages: Message[]): AsyncGenerator<string> {
    const chatMessages = await messageFormatter.formatMessages(messages);
    yield* providerManager.streamChat(chatMessages);
  }

  async generate(prompt: string): Promise<string> {
    return await providerManager.generate(prompt);
  }
}

export const agent = new Agent();
