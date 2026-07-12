import { MemoryContext } from '../MemoryContext.js';
import { MemoryType } from './MemoryTypes.js';

export interface IMemoryModule {
  name: string;
  type: MemoryType;
  initialize(context: MemoryContext): Promise<void>;
  shutdown(): Promise<void>;
}
