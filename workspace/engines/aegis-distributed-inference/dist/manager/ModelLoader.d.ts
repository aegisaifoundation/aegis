import type { ModelRegistry } from './ModelRegistry.js';
import type { BackendManager } from './BackendManager.js';
export declare class ModelLoader {
    private registry;
    private backendManager;
    private activeLoads;
    constructor(registry: ModelRegistry, backendManager: BackendManager);
    loadModel(modelId: string, backendId: string, options?: any): Promise<boolean>;
    unloadModel(modelId: string, backendId: string, force?: boolean): Promise<boolean>;
    isModelResident(modelId: string): boolean;
    listResidentModels(): string[];
    /**
     * Periodically called to evict least-recently-used models.
     */
    evictUnusedModels(maxIdleMs?: number): void;
}
