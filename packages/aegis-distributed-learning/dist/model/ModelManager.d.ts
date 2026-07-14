import type { ModelRecord, ModelLifecycleState } from '../types/index.js';
/**
 * ModelManager
 *
 * Maintains the in-memory model registry with version tracking,
 * hash verification, signature validation, and lifecycle management.
 *
 * The ModelManager does not own the model files themselves —
 * it tracks records, hashes, and version chains.
 * LoRAManager owns the adapter files.
 */
export declare class ModelManager {
    private registry;
    /**
     * Register a new model or a new version of an existing model.
     * Verifies hash integrity before accepting the registration.
     */
    registerModel(record: ModelRecord): void;
    /** Get the most recent record for a model */
    getModel(modelId: string): ModelRecord | undefined;
    /** Get all versions of a model (oldest first) */
    getVersionChain(modelId: string): ModelRecord[];
    /** List the latest record for each registered model */
    listModels(): ModelRecord[];
    /**
     * Add a new version record to an existing model's chain.
     * The previous version is updated to DEPRECATED if autoDeprecate is true.
     */
    addVersion(modelId: string, record: ModelRecord, autoDeprecate?: boolean): void;
    /**
     * Roll back to a specific prior version.
     * The current version is archived; the target version becomes the active one.
     */
    rollback(modelId: string, targetVersion: string): ModelRecord | null;
    /** Transition a model to a new lifecycle state */
    setLifecycleState(modelId: string, version: string, state: ModelLifecycleState): void;
    getModelCount(): number;
    private _verifyCompatibility;
}
//# sourceMappingURL=ModelManager.d.ts.map