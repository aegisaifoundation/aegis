export class OllamaBackend {
    id = 'ollama';
    loadedModels = new Set();
    genCount = 0;
    async loadModel(modelId, options) {
        this.loadedModels.add(modelId);
        console.log(`[OllamaBackend] Pulled/Loaded model ${modelId}.`);
        return true;
    }
    async unloadModel(modelId) {
        this.loadedModels.delete(modelId);
        return true;
    }
    async generate(modelId, prompt, options) {
        this.genCount++;
        return `[Ollama local model: ${modelId}] Response to prompt: "${prompt}"`;
    }
    async stream(modelId, prompt, onChunk, options) {
        this.genCount++;
        const words = `[Ollama local stream: ${modelId}] Response to prompt: "${prompt}"`.split(' ');
        for (const word of words) {
            onChunk(word + ' ');
            await new Promise(r => setTimeout(r, 10));
        }
    }
    async embeddings(modelId, text) {
        return Array.from({ length: 768 }, () => Math.random());
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
//# sourceMappingURL=OllamaBackend.js.map