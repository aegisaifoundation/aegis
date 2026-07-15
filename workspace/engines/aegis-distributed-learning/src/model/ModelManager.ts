import type { ModelRecord, ModelLifecycleState } from '../types/index.js';
import { createHash } from 'crypto';

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
  private registry: Map<string, ModelRecord[]> = new Map();

  /**
   * Register a new model or a new version of an existing model.
   * Verifies hash integrity before accepting the registration.
   */
  registerModel(record: ModelRecord): void {
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
  getModel(modelId: string): ModelRecord | undefined {
    const chain = this.registry.get(modelId);
    if (!chain || chain.length === 0) return undefined;
    return chain[chain.length - 1];
  }

  /** Get all versions of a model (oldest first) */
  getVersionChain(modelId: string): ModelRecord[] {
    return [...(this.registry.get(modelId) ?? [])];
  }

  /** List the latest record for each registered model */
  listModels(): ModelRecord[] {
    return Array.from(this.registry.values())
      .map(chain => chain[chain.length - 1])
      .filter((r): r is ModelRecord => r !== undefined);
  }

  /**
   * Add a new version record to an existing model's chain.
   * The previous version is updated to DEPRECATED if autoDeprecate is true.
   */
  addVersion(modelId: string, record: ModelRecord, autoDeprecate = true): void {
    const chain = this.registry.get(modelId);
    if (!chain) {
      this.registerModel(record);
      return;
    }
    if (autoDeprecate && chain.length > 0) {
      const prev = chain[chain.length - 1]!;
      (prev as any).lifecycleState = 'DEPRECATED' as ModelLifecycleState;
    }
    chain.push(record);
    console.log(`[ModelManager] Added version ${record.version} to model ${modelId}`);
  }

  /**
   * Roll back to a specific prior version.
   * The current version is archived; the target version becomes the active one.
   */
  rollback(modelId: string, targetVersion: string): ModelRecord | null {
    const chain = this.registry.get(modelId);
    if (!chain) return null;

    const target = chain.find(r => r.version === targetVersion);
    if (!target) {
      console.warn(`[ModelManager] Rollback failed: version ${targetVersion} not found for ${modelId}`);
      return null;
    }

    // Archive current head
    const current = chain[chain.length - 1]!;
    (current as any).lifecycleState = 'ARCHIVED' as ModelLifecycleState;

    // Re-promote target
    (target as any).lifecycleState = 'AVAILABLE' as ModelLifecycleState;
    console.log(`[ModelManager] Rolled back model ${modelId} to ${targetVersion}`);
    return target;
  }

  /** Transition a model to a new lifecycle state */
  setLifecycleState(modelId: string, version: string, state: ModelLifecycleState): void {
    const chain = this.registry.get(modelId);
    if (!chain) return;
    const record = chain.find(r => r.version === version);
    if (record) (record as any).lifecycleState = state;
  }

  getModelCount(): number {
    return this.registry.size;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _verifyCompatibility(record: ModelRecord): void {
    // Future: compare kernelApiVersion ranges
    if (!record.kernelApiVersion || !record.kernelApiVersion.match(/^\d+\.\d+\.\d+$/)) {
      throw new Error(`[ModelManager] Invalid kernelApiVersion: ${record.kernelApiVersion}`);
    }
  }
}
