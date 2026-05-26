import { Message } from '../../types/Message.js';
import { SessionMetadata, MemoryEntity } from './MemoryTypes.js';

export interface IMemoryGateway {
  createSession(sessionId: string, tags?: string[], actor?: string): Promise<SessionMetadata>;
  loadSession(sessionId: string, actor?: string): Promise<SessionMetadata>;
  deleteSession(sessionId: string, actor?: string): Promise<void>;
  
  getWorkingMemory(sessionId: string, actor?: string): Promise<string>;
  updateWorkingMemory(sessionId: string, content: string, actor?: string): Promise<void>;
  
  getSessionMemory(sessionId: string, actor?: string): Promise<string>;
  updateSessionMemory(sessionId: string, content: string, actor?: string): Promise<void>;
  
  appendHistory(sessionId: string, message: Message, actor?: string): Promise<void>;
  getHistory(sessionId: string, actor?: string): Promise<Message[]>;
  
  getEntities(sessionId: string, actor?: string): Promise<MemoryEntity[]>;
  updateEntity(sessionId: string, entity: MemoryEntity, actor?: string): Promise<void>;
}
