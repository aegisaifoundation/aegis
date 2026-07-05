import { ProviderContext } from './ProviderContext.js';
export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    metadata?: Record<string, any>;
}
export interface Provider {
    name: string;
    category: string;
    version: string;
    initialize(context: ProviderContext): Promise<void>;
    shutdown(): Promise<void>;
    checkAvailability(): Promise<boolean>;
    streamChat(messages: ChatMessage[]): AsyncGenerator<string>;
    generate(prompt: string): Promise<string>;
}
