import type { LoRAAdapter, LoRAConfig } from '../types/index.js';
/**
 * LoRAManager
 *
 * Owns the complete lifecycle of LoRA adapters within the learning engine.
 *
 * Privacy invariant: the base model is NEVER transmitted, serialised,
 * or exposed. Only delta tensors (the LoRA adapters) move between nodes.
 *
 * Adapters are stored in <workspace>/lora/ as JSON + binary stubs.
 */
export declare class LoRAManager {
    private loraDir;
    private adapters;
    /** In-memory weight store: adapterId → weight map */
    private weights;
    constructor(workspacePath: string);
    /**
     * Create a new LoRA adapter for a given base model.
     * Initialises random delta weights proportional to rank × alpha.
     */
    createAdapter(modelId: string, config: LoRAConfig): LoRAAdapter;
    /** Load an adapter from an absolute file path */
    loadAdapter(adapterPath: string): LoRAAdapter | null;
    /**
     * Merge a LoRA adapter into the base model weights (in-memory only).
     * Returns the merged weight map — the base model file is NEVER written.
     */
    mergeAdapter(baseWeights: Record<string, number[]>, adapterId: string): Record<string, number[]>;
    /**
     * Compress adapter weights via int8-style quantisation.
     * Reduces transmission size while preserving convergence direction.
     */
    compressAdapter(adapterId: string): LoRAAdapter | null;
    /** Export a LoRA adapter as a self-contained JSON blob for P2P transmission */
    exportAdapter(adapterId: string): string | null;
    /** Import a LoRA adapter from an exported blob */
    importAdapter(blob: string): LoRAAdapter | null;
    /** Sign an adapter with a private key (stub: deterministic hash-based) */
    signAdapter(adapterId: string, _privateKey?: string): LoRAAdapter | null;
    /** Verify an adapter's signature */
    verifyAdapter(adapterId: string, _publicKey?: string): boolean;
    /** Store arbitrary metadata as a JSON sidecar */
    storeMetadata(adapterId: string, meta: Record<string, any>): void;
    getAdapter(adapterId: string): LoRAAdapter | undefined;
    listAdapters(): LoRAAdapter[];
    /** Returns the latest adapter's weight map (for use by strategies) */
    getLatestAdapterWeights(): Record<string, number[]>;
    /** Update adapter weights (used by LocalTrainer after a training epoch) */
    updateAdapterWeights(adapterId: string, newWeights: Record<string, number[]>): void;
    getAdapterCount(): number;
    private _persistAdapter;
    private _loadExistingAdapters;
    private _hashWeights;
    private _stubSign;
    private _ensureDir;
}
//# sourceMappingURL=LoRAManager.d.ts.map