export class ModelLoader {
    registry;
    backendManager;
    activeLoads = new Map();
    constructor(registry, backendManager) {
        this.registry = registry;
        this.backendManager = backendManager;
    }
    async loadModel(modelId, backendId, options) {
        const meta = this.registry.getModel(modelId);
        if (!meta) {
            throw new Error(`[ModelLoader] Model ${modelId} is not registered.`);
        }
        const currentLoad = this.activeLoads.get(modelId);
        if (currentLoad) {
            currentLoad.refCount++;
            currentLoad.lastAccessed = new Date();
            console.log(`[ModelLoader] Model ${modelId} is already resident (refCount: ${currentLoad.refCount}).`);
            return true;
        }
        const backend = this.backendManager.getBackend(backendId);
        if (!backend) {
            throw new Error(`[ModelLoader] Backend ${backendId} is not registered.`);
        }
        // Lazy load / load invocation
        const loaded = await backend.loadModel(modelId, options);
        if (loaded) {
            this.activeLoads.set(modelId, { refCount: 1, lastAccessed: new Date() });
            console.log(`[ModelLoader] Successfully loaded and cached model ${modelId} into backend ${backendId}.`);
        }
        return loaded;
    }
    async unloadModel(modelId, backendId, force = false) {
        const currentLoad = this.activeLoads.get(modelId);
        if (!currentLoad)
            return false;
        currentLoad.refCount--;
        currentLoad.lastAccessed = new Date();
        if (currentLoad.refCount <= 0 || force) {
            const backend = this.backendManager.getBackend(backendId);
            if (backend) {
                await backend.unloadModel(modelId);
            }
            this.activeLoads.delete(modelId);
            console.log(`[ModelLoader] Unloaded model ${modelId} from memory (fully dereferenced).`);
            return true;
        }
        console.log(`[ModelLoader] Decremented refCount for model ${modelId} (active refCount: ${currentLoad.refCount}).`);
        return false;
    }
    isModelResident(modelId) {
        return this.activeLoads.has(modelId);
    }
    listResidentModels() {
        return Array.from(this.activeLoads.keys());
    }
    /**
     * Periodically called to evict least-recently-used models.
     */
    evictUnusedModels(maxIdleMs = 60000) {
        const now = Date.now();
        for (const [modelId, details] of this.activeLoads.entries()) {
            if (details.refCount <= 0 && now - details.lastAccessed.getTime() > maxIdleMs) {
                console.log(`[ModelLoader] Evicting idle model ${modelId} due to inactivity.`);
                this.activeLoads.delete(modelId);
            }
        }
    }
}
//# sourceMappingURL=ModelLoader.js.map