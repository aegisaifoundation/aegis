import { Message } from '../types/Message.js';
import { SessionMemory } from './SessionMemory.js';

export class MemoryManager {
  private sessionMemory: SessionMemory | null = null;
  private memories: Message[] = [];

  constructor(sessionId: string = 'default') {
    try {
      this.sessionMemory = new SessionMemory(sessionId);
    } catch (e) {
      console.warn('MemoryManager running without persistence:', e);
    }
  }

  async init(): Promise<void> {
    if (!this.sessionMemory) return;
    try {
      this.memories = await this.sessionMemory.load();
    } catch (e) {
      console.error('Failed to load memory sessions:', e);
      this.memories = [];
    }
  }

  async addMemory(role: Message['role'], content: string, metadata?: Record<string, any>): Promise<void> {
    this.memories.push({
      role,
      content,
      timestamp: new Date().toISOString(),
      metadata,
    });
    await this.persist();
  }

  getMemories(): Message[] {
    return this.memories;
  }

  async clear(): Promise<void> {
    this.memories = [];
    await this.persist();
  }

  private async persist(): Promise<void> {
    if (!this.sessionMemory) return;
    try {
      await this.sessionMemory.save(this.memories);
    } catch (e) {
      console.error('Failed to persist memory:', e);
    }
  }
}

export const memoryManager = new MemoryManager();
