export class LlamaCppBackend {
    id = 'llama.cpp';
    loadedModels = new Set();
    genCount = 0;
    async loadModel(modelId, options) {
        this.loadedModels.add(modelId);
        console.log(`[LlamaCppBackend] Loaded model ${modelId} with GGUF parameters.`);
        return true;
    }
    async unloadModel(modelId) {
        this.loadedModels.delete(modelId);
        return true;
    }
    async generate(modelId, prompt, options) {
        this.genCount++;
        return `[llama.cpp local model: ${modelId}] Response to prompt: "${prompt}"`;
    }
    async stream(modelId, prompt, onChunk, options) {
        this.genCount++;
        const words = `[llama.cpp local stream: ${modelId}] Response to prompt: "${prompt}"`.split(' ');
        for (const word of words) {
            onChunk(word + ' ');
            await new Promise(r => setTimeout(r, 10));
        }
    }
    async embeddings(modelId, text) {
        return Array.from({ length: 384 }, () => Math.random());
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
//# sourceMappingURL=LlamaCppBackend.js.map