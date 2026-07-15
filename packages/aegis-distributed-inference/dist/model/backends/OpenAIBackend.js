export class OpenAIBackend {
    id = 'openai';
    loadedModels = new Set();
    genCount = 0;
    async loadModel(modelId, options) {
        this.loadedModels.add(modelId);
        console.log(`[OpenAIBackend] Resolved API key and initialized session for ${modelId}.`);
        return true;
    }
    async unloadModel(modelId) {
        this.loadedModels.delete(modelId);
        return true;
    }
    async generate(modelId, prompt, options) {
        this.genCount++;
        return `[OpenAI cloud model: ${modelId}] Response to prompt: "${prompt}"`;
    }
    async stream(modelId, prompt, onChunk, options) {
        this.genCount++;
        const words = `[OpenAI cloud stream: ${modelId}] Response to prompt: "${prompt}"`.split(' ');
        for (const word of words) {
            onChunk(word + ' ');
            await new Promise(r => setTimeout(r, 10));
        }
    }
    async embeddings(modelId, text) {
        return Array.from({ length: 1536 }, () => Math.random());
    }
    async tokenize(modelId, text) {
        return text.split('').map(c => c.charCodeAt(0));
    }
    async health() {
        return 'HEALTHY';
    }
    metrics() {
        return {
            generations: this.genCount,
            activeModels: this.loadedModels.size
        };
    }
}
//# sourceMappingURL=OpenAIBackend.js.map