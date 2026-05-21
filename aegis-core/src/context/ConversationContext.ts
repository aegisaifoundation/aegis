import { Message } from '../types/Message.js';
import { memoryManager } from '../memory/index.js';

export class ConversationContext {
  private activeState: Record<string, any> = {};
  private metadata: Record<string, any> = {};

  async addMessage(
    role: Message['role'],
    content: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await memoryManager.addMemory(role, content, metadata);
  }

  async getMessages(): Promise<Message[]> {
    return memoryManager.getMemories();
  }

  async clear(): Promise<void> {
    await memoryManager.clear();
    this.activeState = {};
    this.metadata = {};
  }

  setActiveState(key: string, value: any): void {
    this.activeState[key] = value;
  }

  getActiveState(key: string): any {
    return this.activeState[key];
  }

  setMetadata(key: string, value: any): void {
    this.metadata[key] = value;
  }

  getMetadata(key: string): any {
    return this.metadata[key];
  }
}

export const conversationContext = new ConversationContext();
