export class vLLMBackend {
    id = 'vllm';
    async loadModel(modelId) { return true; }
    async unloadModel(modelId) { return true; }
    async generate(modelId, prompt) {
        return `[vLLM model: ${modelId}] Response: "${prompt}"`;
    }
    async stream(modelId, prompt, onChunk) {
        onChunk(`[vLLM model stream: ${modelId}] Response: "${prompt}"`);
    }
    async embeddings(modelId, text) { return [1.0]; }
    async tokenize(modelId, text) { return [1]; }
    async health() { return 'HEALTHY'; }
    metrics() { return {}; }
}
//# sourceMappingURL=vLLMBackend.js.map