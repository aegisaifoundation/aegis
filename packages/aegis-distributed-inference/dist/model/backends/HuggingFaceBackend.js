export class HuggingFaceBackend {
    id = 'huggingface';
    async loadModel(modelId) { return true; }
    async unloadModel(modelId) { return true; }
    async generate(modelId, prompt) {
        return `[HuggingFace model: ${modelId}] Response: "${prompt}"`;
    }
    async stream(modelId, prompt, onChunk) {
        onChunk(`[HuggingFace model stream: ${modelId}] Response: "${prompt}"`);
    }
    async embeddings(modelId, text) { return [1.0]; }
    async tokenize(modelId, text) { return [1]; }
    async health() { return 'HEALTHY'; }
    metrics() { return {}; }
}
//# sourceMappingURL=HuggingFaceBackend.js.map