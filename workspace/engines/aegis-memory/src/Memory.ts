import { MemoryContext } from './MemoryContext.js';

export interface Memory {
  name: string;
  initialize(context: MemoryContext): Promise<void>;
  shutdown(): Promise<void>;
  read(key: string): Promise<any>;
  write(key: string, value: any): Promise<void>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
}
