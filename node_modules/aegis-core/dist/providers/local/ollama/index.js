import { Ollama } from 'ollama';
import { config } from '../../../aegis-core/src/config/index.js';
export class OllamaProvider {
    name = 'local/ollama';
    category = 'local';
    version = '1.0.0';
    ollama;
    host;
    model;
    async initialize(context) {
        this.host = context.config.host || config.OLLAMA_HOST || 'http://127.0.0.1:11434';
        this.model = context.config.model || config.MODEL_NAME || 'gemma4:latest';
        this.ollama = new Ollama({ host: this.host });
    }
    async shutdown() {
        // No cleanup required
    }
    async checkAvailability() {
        try {
            const response = await this.ollama.list();
            return response.models.some(m => m.name.includes(this.model));
        }
        catch (error) {
            console.error('Ollama connection error:', error);
            return false;
        }
    }
    async *streamChat(messages) {
        const mappedMessages = messages.map(m => {
            let role = 'system';
            if (m.role === 'user')
                role = 'user';
            if (m.role === 'assistant')
                role = 'assistant';
            return { role, content: m.content };
        });
        const response = await this.ollama.chat({
            model: this.model,
            messages: mappedMessages,
            stream: true,
        });
        for await (const part of response) {
            yield part.message.content;
        }
    }
    async generate(prompt) {
        const response = await this.ollama.generate({
            model: this.model,
            prompt,
        });
        return response.response;
    }
}
export default new OllamaProvider();
