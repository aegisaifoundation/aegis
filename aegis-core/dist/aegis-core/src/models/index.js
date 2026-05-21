import { OllamaProvider } from './OllamaProvider.js';
export class ModelHandler {
    provider;
    constructor() {
        this.provider = new OllamaProvider();
    }
    setProvider(provider) {
        this.provider = provider;
    }
    async checkModelAvailability() {
        return this.provider.checkAvailability();
    }
    streamChat(messages) {
        return this.provider.streamChat(messages);
    }
    async generate(prompt) {
        return this.provider.generate(prompt);
    }
}
export const modelHandler = new ModelHandler();
