import { IMemoryModule } from '../interfaces/IMemoryModule.js';
import { MemoryType } from '../interfaces/MemoryTypes.js';

export class MemoryModuleRegistry {
  private static instance = new MemoryModuleRegistry();
  private modules = new Map<string, IMemoryModule>();

  public static getInstance(): MemoryModuleRegistry {
    return this.instance;
  }

  register(name: string, module: IMemoryModule): void {
    if (this.modules.has(name)) {
      throw new Error(`Memory module ${name} is already registered.`);
    }
    this.modules.set(name, module);
  }

  unregister(name: string): void {
    this.modules.delete(name);
  }

  resolve(name: string): IMemoryModule | undefined {
    return this.modules.get(name);
  }

  resolveByType(type: MemoryType): IMemoryModule[] {
    return Array.from(this.modules.values()).filter(m => m.type === type);
  }

  list(): IMemoryModule[] {
    return Array.from(this.modules.values());
  }

  clear(): void {
    this.modules.clear();
  }
}

export const memoryModuleRegistry = MemoryModuleRegistry.getInstance();
