import { Message } from '../types/Message.js';
export declare class ConversationContext {
    private activeState;
    private metadata;
    addMessage(role: Message['role'], content: string, metadata?: Record<string, any>): Promise<void>;
    getMessages(): Promise<Message[]>;
    clear(): Promise<void>;
    setActiveState(key: string, value: any): void;
    getActiveState(key: string): any;
    setMetadata(key: string, value: any): void;
    getMetadata(key: string): any;
}
export declare const conversationContext: ConversationContext;
