import { providerManager } from '@aegis/providers';
import { messageFormatter } from './MessageFormatter.js';
export class Agent {
    async *streamChat(messages) {
        const chatMessages = await messageFormatter.formatMessages(messages);
        yield* providerManager.streamChat(chatMessages);
    }
    async generate(prompt) {
        return await providerManager.generate(prompt);
    }
}
export const agent = new Agent();
