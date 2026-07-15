export class TensorRTBackend {
    id = 'tensorrt';
    async loadModel(modelId) { return true; }
    async unloadModel(modelId) { return true; }
    async generate(modelId, prompt) {
        return `[TensorRT model: ${modelId}] Response: "${prompt}"`;
    }
    async stream(modelId, prompt, onChunk) {
        onChunk(`[TensorRT model stream: ${modelId}] Response: "${prompt}"`);
    }
    async embeddings(modelId, text) { return [1.0]; }
    async tokenize(modelId, text) { return [1]; }
    async health() { return 'HEALTHY'; }
    metrics() { return {}; }
}
//# sourceMappingURL=TensorRTBackend.js.map