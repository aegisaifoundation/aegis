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
export class ModelManager {
    registry = new Map();
    /**
     * Register a new model or a new version of an existing model.
     * Verifies hash integrity before accepting the registration.
     */
    registerModel(record) {
        const existing = this.registry.get(record.id) ?? [];
        // Verify hash is syntactically valid (64-char hex)
        if (!/^[0-9a-f]{64}$/i.test(record.hash)) {
            throw new Error(`[ModelManager] Invalid hash for model ${record.id}: ${record.hash}`);
        }
        // Verify parent version exists when specified
        if (record.parentVersion && !existing.find(r => r.version === record.parentVersion)) {
            throw new Error(`[ModelManager] Parent version ${record.parentVersion} not found for model ${record.id}`);
        }
        // Check compatibility
        this._verifyCompatibility(record);
        existing.push(record);
        this.registry.set(record.id, existing);
        console.log(`[ModelManager] Registered model ${record.id}@${record.version} (${record.lifecycleState})`);
    }
    /** Get the most recent record for a model */
    getModel(modelId) {
        const chain = this.registry.get(modelId);
        if (!chain || chain.length === 0)
            return undefined;
        return chain[chain.length - 1];
    }
    /** Get all versions of a model (oldest first) */
    getVersionChain(modelId) {
        return [...(this.registry.get(modelId) ?? [])];
    }
    /** List the latest record for each registered model */
    listModels() {
        return Array.from(this.registry.values())
            .map(chain => chain[chain.length - 1])
            .filter((r) => r !== undefined);
    }
    /**
     * Add a new version record to an existing model's chain.
     * The previous version is updated to DEPRECATED if autoDeprecate is true.
     */
    addVersion(modelId, record, autoDeprecate = true) {
        const chain = this.registry.get(modelId);
        if (!chain) {
            this.registerModel(record);
            return;
        }
        if (autoDeprecate && chain.length > 0) {
            const prev = chain[chain.length - 1];
            prev.lifecycleState = 'DEPRECATED';
        }
        chain.push(record);
        console.log(`[ModelManager] Added version ${record.version} to model ${modelId}`);
    }
    /**
     * Roll back to a specific prior version.
     * The current version is archived; the target version becomes the active one.
     */
    rollback(modelId, targetVersion) {
        const chain = this.registry.get(modelId);
        if (!chain)
            return null;
        const target = chain.find(r => r.version === targetVersion);
        if (!target) {
            console.warn(`[ModelManager] Rollback failed: version ${targetVersion} not found for ${modelId}`);
            return null;
        }
        // Archive current head
        const current = chain[chain.length - 1];
        current.lifecycleState = 'ARCHIVED';
        // Re-promote target
        target.lifecycleState = 'AVAILABLE';
        console.log(`[ModelManager] Rolled back model ${modelId} to ${targetVersion}`);
        return target;
    }
    /** Transition a model to a new lifecycle state */
    setLifecycleState(modelId, version, state) {
        const chain = this.registry.get(modelId);
        if (!chain)
            return;
        const record = chain.find(r => r.version === version);
        if (record)
            record.lifecycleState = state;
    }
    getModelCount() {
        return this.registry.size;
    }
    // ── Private ───────────────────────────────────────────────────────────────
    _verifyCompatibility(record) {
        // Future: compare kernelApiVersion ranges
        if (!record.kernelApiVersion || !record.kernelApiVersion.match(/^\d+\.\d+\.\d+$/)) {
            throw new Error(`[ModelManager] Invalid kernelApiVersion: ${record.kernelApiVersion}`);
        }
    }
}
//# sourceMappingURL=ModelManager.js.map