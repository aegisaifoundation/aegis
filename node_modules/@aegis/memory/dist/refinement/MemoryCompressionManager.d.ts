import { Message } from '@aegis/runtime';
export interface CompressedHistory {
    goals: string[];
    facts: string[];
    decisions: string[];
    risks: string[];
}
export declare class MemoryCompressionManager {
    private static instance;
    static getInstance(): MemoryCompressionManager;
    compressHistory(sessionId: string, messages: Message[]): Promise<CompressedHistory>;
    private fallbackParse;
}
export declare const memoryCompressionManager: MemoryCompressionManager;
