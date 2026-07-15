export interface ContextMessage {
    readonly role: 'user' | 'assistant' | 'system' | 'tool';
    readonly content: string;
    readonly timestamp: Date;
}
export declare class ContextManager {
    private sessionContexts;
    addMessage(sessionId: string, role: 'user' | 'assistant' | 'system' | 'tool', content: string): void;
    getMessages(sessionId: string): ContextMessage[];
    clearContext(sessionId: string): void;
    compressContext(sessionId: string): void;
    getContextSizeTokens(sessionId: string): number;
}
