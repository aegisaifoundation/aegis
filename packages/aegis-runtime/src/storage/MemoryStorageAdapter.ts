import { IStorageAdapter } from './IStorageAdapter.js';

export class MemoryStorageAdapter implements IStorageAdapter {
  private store = new Map<string, any>();

  async initialize(): Promise<void> {}

  async get<T>(key: string): Promise<T | undefined> {
    return this.store.get(key);
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return this.store.has(key);
  }

  async list(prefix?: string): Promise<string[]> {
    const keys = Array.from(this.store.keys());
    if (!prefix) return keys;
    return keys.filter(k => k.startsWith(prefix));
  }

  async close(): Promise<void> {
    this.store.clear();
  }
}
