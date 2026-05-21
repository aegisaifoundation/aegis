import { modelHandler } from '../models/index.js';
import { messageFormatter } from './MessageFormatter.js';
export class Agent {
    async *streamChat(messages) {
        const chatMessages = messageFormatter.formatMessages(messages);
        yield* modelHandler.streamChat(chatMessages);
    }
    async generate(prompt) {
        return await modelHandler.generate(prompt);
    }
}
export const agent = new Agent();
