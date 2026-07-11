import { SessionMetadata } from './interfaces/MemoryTypes.js';
import { Message } from '../types/Message.js';
export declare class MemoryManager {
    private refiner;
    private cache;
    private memories;
    /**
     * Initializes the memory system, creating core workspace folders and starting cleanup background task.
     */
    initialize(): Promise<void>;
    private getActiveSessionId;
    switchActiveSession(sessionId: string): Promise<void>;
    /**
     * Legacy initialization method for backward-compatibility.
     */
    init(): Promise<void>;
    addMemory(role: Message['role'], content: string, metadata?: Record<string, any>): Promise<void>;
    /**
     * Legacy memory retrieval method for backward-compatibility.
     */
    getMemories(): Message[];
    /**
     * Legacy clear method for backward-compatibility.
     */
    clear(): Promise<void>;
    /**
     * Shuts down the cleanup scheduler and releases cached entries.
     */
    shutdown(): Promise<void>;
    createSession(sessionId: string, tags?: string[], actor?: string): Promise<SessionMetadata>;
    loadSession(sessionId: string, actor?: string): Promise<SessionMetadata>;
    deleteSession(sessionId: string, actor?: string): Promise<void>;
    archiveSession(sessionId: string, actor?: string): Promise<void>;
    getSessionMemory(sessionId: string, actor?: string): Promise<string>;
    updateSessionMemory(sessionId: string, content: string, actor?: string): Promise<void>;
    getWorkingMemory(sessionId: string, actor?: string): Promise<string>;
    updateWorkingMemory(sessionId: string, content: string, actor?: string): Promise<void>;
    getTask(sessionId: string, actor?: string): Promise<string>;
    updateTask(sessionId: string, content: string, actor?: string): Promise<void>;
    appendHistory(sessionId: string, role: Message['role'], content: string, metadata?: Record<string, any>, actor?: string): Promise<void>;
    getHistory(sessionId: string, actor?: string): Promise<Message[]>;
    getMetadata(sessionId: string, actor?: string): Promise<SessionMetadata>;
    updateMetadata(sessionId: string, metadata: Partial<SessionMetadata>, actor?: string): Promise<void>;
    compress(sessionId: string, actor?: string): Promise<void>;
    createSnapshot(sessionId: string, fileType: 'history' | 'sessionMemory' | 'workingMemory' | 'task', actor?: string): Promise<string>;
    recoverCorruptedMemory(sessionId: string): Promise<boolean>;
    private verifySessionIntegrity;
    /**
     * Manual trigger for cleanups.
     */
    cleanup(): Promise<void>;
}
export declare const memoryManager: MemoryManager;
