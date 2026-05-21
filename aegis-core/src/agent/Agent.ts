import { modelHandler } from '../models/index.js';
import { Message } from '../types/Message.js';
import { messageFormatter } from './MessageFormatter.js';

export class Agent {
  async *streamChat(messages: Message[]): AsyncGenerator<string> {
    const chatMessages = messageFormatter.formatMessages(messages);
    yield* modelHandler.streamChat(chatMessages);
  }

  async generate(prompt: string): Promise<string> {
    return await modelHandler.generate(prompt);
  }
}

export const agent = new Agent();
