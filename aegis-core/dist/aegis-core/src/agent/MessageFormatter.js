import { promptBuilder } from './PromptBuilder.js';
export class MessageFormatter {
    formatMessages(messages) {
        const formatted = [];
        // Prepend the dynamic system prompt
        formatted.push({
            role: 'system',
            content: promptBuilder.buildSystemPrompt()
        });
        // Map each message to standard model chat message
        for (const msg of messages) {
            let role = 'user';
            if (msg.role === 'assistant')
                role = 'assistant';
            if (msg.role === 'system')
                role = 'system';
            if (msg.role === 'tool' || msg.role === 'observation')
                role = 'tool';
            formatted.push({
                role,
                content: msg.content
            });
        }
        return formatted;
    }
}
export const messageFormatter = new MessageFormatter();
