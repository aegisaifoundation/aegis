export class ModelRegistry {
    registry = new Map();
    constructor() {
        // Register default mock models
        this.registerModel({
            id: 'llama-3',
            name: 'Llama 3 8B Instruct GGUF',
            version: '1.0.0',
            hash: 'sha256:llama3hashstub',
            contextLength: 8192,
            embeddingSize: 4096,
            quantization: 'Q4_K_M',
            resourceRequirements: { cpu: 4, memoryMb: 6144, gpu: true },
            license: 'llama3',
            supportedTasks: ['text-generation', 'chat', 'tools']
        });
        this.registerModel({
            id: 'gpt-4o',
            name: 'GPT-4o Cloud',
            version: 'latest',
            hash: 'remote-cloud-provider',
            contextLength: 128000,
            embeddingSize: 1536,
            resourceRequirements: { cpu: 0, memoryMb: 0, gpu: false },
            license: 'commercial',
            supportedTasks: ['text-generation', 'chat', 'embeddings', 'tools']
        });
    }
    registerModel(meta) {
        this.registry.set(meta.id, meta);
    }
    getModel(modelId) {
        return this.registry.get(modelId);
    }
    listModels() {
        return Array.from(this.registry.values());
    }
    removeModel(modelId) {
        this.registry.delete(modelId);
    }
}
//# sourceMappingURL=ModelRegistry.js.map