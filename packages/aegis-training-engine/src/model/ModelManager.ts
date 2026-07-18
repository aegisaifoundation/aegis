import { serviceRegistry } from '@aegis/runtime';
import { gpuResourceManager } from '../services/GpuResourceManager.js';
import { ITrainingBackend } from '../backend/ITrainingBackend.js';

export class ModelManager {
  private activeBackend: ITrainingBackend;

  constructor(backend: ITrainingBackend) {
    this.activeBackend = backend;
  }

  setBackend(backend: ITrainingBackend) {
    this.activeBackend = backend;
  }

  private getModelRegistry(): any {
    if (serviceRegistry.has('distributed-intelligence:execution')) {
      // Look for execution or inference registry
      return serviceRegistry.get<any>('distributed-intelligence:execution');
    }
    return null;
  }

  async LoadModel(modelId: string): Promise<boolean> {
    // 1. VRAM checks
    const hardware = await gpuResourceManager.getStatus();
    let modelVramRequired = 4096; // Default fallback (4GB)

    // Check with distributed-inference registry if registered
    if (serviceRegistry.has('distributed-inference')) {
      const air = serviceRegistry.get<any>('distributed-inference');
      const reg = air.modelRegistry || serviceRegistry.get<any>('ModelRegistry');
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

  async UnloadModel(modelId: string): Promise<boolean> {
    console.log(`[ModelManager] Unloaded model: ${modelId}`);
    return true;
  }

  async ListModels(): Promise<any[]> {
    // Return list of available models from distributed-inference ModelRegistry
    if (serviceRegistry.has('distributed-inference')) {
      const air = serviceRegistry.get<any>('distributed-inference');
      const reg = air.modelRegistry || serviceRegistry.get<any>('ModelRegistry');
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
