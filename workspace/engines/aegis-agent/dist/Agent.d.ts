import { Message } from '@aegis/runtime';
export declare class Agent {
    streamChat(messages: Message[]): AsyncGenerator<string>;
    generate(prompt: string): Promise<string>;
}
export declare const agent: Agent;
