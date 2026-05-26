import { Message } from '../../types/Message.js';

export interface IMemoryRefiner {
  refineSessionMemory(sessionId: string, history: Message[], currentSessionMemory: string): Promise<string>;
  refineWorkingMemory(sessionId: string, currentWorkingMemory: string): Promise<string>;
}
