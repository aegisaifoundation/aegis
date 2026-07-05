import { Memory } from './Memory.js';

export class MemoryRegistry {
  private static instance = new MemoryRegistry();
  private modules = new Map<string, Memory>();

  static getInstance(): MemoryRegistry {
    return this.instance;
  }

  register(name: string, module: Memory): void {
    this.modules.set(name, module);
  }

  unregister(name: string): void {
    this.modules.delete(name);
  }

  get(name: string): Memory | undefined {
    return this.modules.get(name);
  }

  list(): Memory[] {
    return Array.from(this.modules.values());
  }
}

export const memoryRegistry = MemoryRegistry.getInstance();
