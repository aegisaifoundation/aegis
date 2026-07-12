import { Message } from '@aegis/runtime';
import { ChatMessage } from '@aegis/providers';
export declare class MessageFormatter {
    formatMessages(messages: Message[]): Promise<ChatMessage[]>;
}
export declare const messageFormatter: MessageFormatter;
