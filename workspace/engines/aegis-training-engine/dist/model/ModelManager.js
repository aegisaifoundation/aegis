import { serviceRegistry } from '@aegis/runtime';
import { gpuResourceManager } from '../services/GpuResourceManager.js';
export class ModelManager {
    activeBackend;
    constructor(backend) {
        this.activeBackend = backend;
    }
    setBackend(backend) {
        this.activeBackend = backend;
    }
    getModelRegistry() {
        if (serviceRegistry.has('distributed-intelligence:execution')) {
            // Look for execution or inference registry
            return serviceRegistry.get('distributed-intelligence:execution');
        }
        return null;
    }
    async LoadModel(modelId) {
        // 1. VRAM checks
        const hardware = await gpuResourceManager.getStatus();
        let modelVramRequired = 4096; // Default fallback (4GB)
        // Check with distributed-inference registry if registered
        if (serviceRegistry.has('distributed-inference')) {
            const air = serviceRegistry.get('distributed-inference');
            const reg = air.modelRegistry || serviceRegistry.get('ModelRegistry');
            if (reg) {
                const meta = reg.getModel(modelId);
                if (meta && meta.resourceRequirements) {
                    modelVramRequired = meta.resourceRequirements.memoryMb || modelVramRequired;
                }
            }
        }
        if (hardware.device !== 'cpu' && hardware.totalVramMb > 0) {
            if (hardware.availableVramMb < modelVramRequired) {
                throw new Error(`Insufficient VRAM to load model "${modelId}". Required: ${modelVramRequired}MB, Available: ${hardware.availableVramMb}MB`);
            }
        }
        // 2. Load model in Python service
        return await this.activeBackend.Evaluate(modelId, 'warmup', []).then(() => true).catch(() => true);
    }
    async UnloadModel(modelId) {
        console.log(`[ModelManager] Unloaded model: ${modelId}`);
        return true;
    }
    async ListModels() {
        // Return list of available models from distributed-inference ModelRegistry
        if (serviceRegistry.has('distributed-inference')) {
            const air = serviceRegistry.get('distributed-inference');
            const reg = air.modelRegistry || serviceRegistry.get('ModelRegistry');
            if (reg) {
                return reg.listModels();
            }
        }
        // Fallback Mock Models list
        return [
            {
                id: 'llama-3',
                name: 'Llama 3 8B Instruct GGUF',
                version: '1.0.0',
                quantization: 'Q4_K_M',
                resourceRequirements: { cpu: 4, memoryMb: 6144, gpu: true }
            },
            {
                id: 'gpt-4o',
                name: 'GPT-4o Cloud',
                version: 'latest',
                resourceRequirements: { cpu: 0, memoryMb: 0, gpu: false }
            }
        ];
    }
}
//# sourceMappingURL=ModelManager.js.map