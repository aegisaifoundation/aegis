import { createHash } from 'crypto';
import type { LoRAAdapter, LoRAConfig, TrainingMetrics } from '../types/index.js';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

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
export class LoRAManager {
  private loraDir: string;
  private adapters: Map<string, LoRAAdapter> = new Map();
  /** In-memory weight store: adapterId → weight map */
  private weights: Map<string, Record<string, number[]>> = new Map();

  constructor(workspacePath: string) {
    this.loraDir = path.join(workspacePath, 'lora');
    this._ensureDir(this.loraDir);
    this._loadExistingAdapters();
  }

  // ── Create / Load ─────────────────────────────────────────────────────────

  /**
   * Create a new LoRA adapter for a given base model.
   * Initialises random delta weights proportional to rank × alpha.
   */
  createAdapter(modelId: string, config: LoRAConfig): LoRAAdapter {
    const id = `lora-${randomUUID()}`;
    const version = 'v1.0.0';

    // Simulate delta tensor initialisation
    const initialWeights: Record<string, number[]> = {};
    for (const module of config.targetModules) {
      initialWeights[module] = Array.from({ length: config.rank }, () =>
        (Math.random() - 0.5) * 0.02 * (config.alpha / config.rank)
      );
    }
    this.weights.set(id, initialWeights);

    const adapterPath = path.join(this.loraDir, `${id}.json`);
    const hash = this._hashWeights(initialWeights);

    const adapter: LoRAAdapter = {
      id,
      modelId,
      version,
      rank: config.rank,
      alpha: config.alpha,
      path: adapterPath,
      hash,
      signature: this._stubSign(hash, id),
      sizeBytes: JSON.stringify(initialWeights).length,
      createdAt: new Date(),
      metadata: { targetModules: config.targetModules, dropout: config.dropout }
    };

    this.adapters.set(id, adapter);
    this._persistAdapter(adapter, initialWeights);
    console.log(`[LoRAManager] Created adapter ${id} for model ${modelId} (rank=${config.rank})`);
    return adapter;
  }

  /** Load an adapter from an absolute file path */
  loadAdapter(adapterPath: string): LoRAAdapter | null {
    if (!fs.existsSync(adapterPath)) return null;
    try {
      const { adapter, weights } = JSON.parse(fs.readFileSync(adapterPath, 'utf8'));
      adapter.createdAt = new Date(adapter.createdAt);
      this.adapters.set(adapter.id, adapter);
      this.weights.set(adapter.id, weights);
      console.log(`[LoRAManager] Loaded adapter ${adapter.id} from ${adapterPath}`);
      return adapter;
    } catch {
      return null;
    }
  }

  // ── Transform ─────────────────────────────────────────────────────────────

  /**
   * Merge a LoRA adapter into the base model weights (in-memory only).
   * Returns the merged weight map — the base model file is NEVER written.
   */
  mergeAdapter(baseWeights: Record<string, number[]>, adapterId: string): Record<string, number[]> {
    const loraWeights = this.weights.get(adapterId) ?? {};
    const merged: Record<string, number[]> = { ...baseWeights };
    for (const [key, delta] of Object.entries(loraWeights)) {
      if (merged[key]) {
        merged[key] = merged[key]!.map((w, i) => w + (delta[i] ?? 0));
      } else {
        merged[key] = [...delta];
      }
    }
    return merged;
  }

  /**
   * Compress adapter weights via int8-style quantisation.
   * Reduces transmission size while preserving convergence direction.
   */
  compressAdapter(adapterId: string): LoRAAdapter | null {
    const adapter = this.adapters.get(adapterId);
    const wts = this.weights.get(adapterId);
    if (!adapter || !wts) return null;

    const compressed: Record<string, number[]> = {};
    for (const [key, values] of Object.entries(wts)) {
      // Scale to int8 range [-127, 127]
      const max = Math.max(...values.map(Math.abs)) || 1;
      compressed[key] = values.map(v => Math.round((v / max) * 127) / 127 * max);
    }

    this.weights.set(adapterId, compressed);
    const newHash = this._hashWeights(compressed);
    const updated: LoRAAdapter = {
      ...adapter,
      hash: newHash,
      signature: this._stubSign(newHash, adapterId),
      sizeBytes: JSON.stringify(compressed).length,
      metadata: { ...adapter.metadata, compressed: true }
    };
    this.adapters.set(adapterId, updated);
    this._persistAdapter(updated, compressed);
    console.log(`[LoRAManager] Compressed adapter ${adapterId}.`);
    return updated;
  }

  /**
   * Quantize adapter weights (int8 format).
   * Reduces precision representation of weight floats.
   */
  quantizeAdapter(adapterId: string, bits = 8): LoRAAdapter | null {
    const adapter = this.adapters.get(adapterId);
    const wts = this.weights.get(adapterId);
    if (!adapter || !wts) return null;

    const quantized: Record<string, number[]> = {};
    const maxVal = bits === 4 ? 7 : 127;
    for (const [key, values] of Object.entries(wts)) {
      const max = Math.max(...values.map(Math.abs)) || 1;
      quantized[key] = values.map(v => Math.round((v / max) * maxVal) / maxVal * max);
    }

    this.weights.set(adapterId, quantized);
    const newHash = this._hashWeights(quantized);
    const updated: LoRAAdapter = {
      ...adapter,
      hash: newHash,
      signature: this._stubSign(newHash, adapterId),
      sizeBytes: JSON.stringify(quantized).length,
      metadata: { ...adapter.metadata, quantized: true, quantizationBits: bits }
    };
    this.adapters.set(adapterId, updated);
    this._persistAdapter(updated, quantized);
    console.log(`[LoRAManager] Quantized adapter ${adapterId} to ${bits} bits.`);
    return updated;
  }

  /** Export a LoRA adapter as a self-contained JSON blob for P2P transmission */
  exportAdapter(adapterId: string): string | null {
    const adapter = this.adapters.get(adapterId);
    const wts = this.weights.get(adapterId);
    if (!adapter || !wts) return null;

    // Privacy check: never include base model path or raw user data
    const exportPayload = {
      format: 'aegis-lora-v1',
      adapter: {
        id: adapter.id,
        modelId: adapter.modelId,
        version: adapter.version,
        rank: adapter.rank,
        alpha: adapter.alpha,
        hash: adapter.hash,
        signature: adapter.signature,
        metadata: adapter.metadata
      },
      weights: wts
    };

    return JSON.stringify(exportPayload);
  }

  /** Import a LoRA adapter from an exported blob */
  importAdapter(blob: string): LoRAAdapter | null {
    try {
      const { format, adapter: raw, weights } = JSON.parse(blob);
      if (format !== 'aegis-lora-v1') throw new Error('Unsupported format');

      // Verify hash integrity
      const expectedHash = this._hashWeights(weights);
      if (expectedHash !== raw.hash) {
        console.warn(`[LoRAManager] Import hash mismatch for ${raw.id}. Rejecting.`);
        return null;
      }

      const adapterPath = path.join(this.loraDir, `${raw.id}.json`);
      const adapter: LoRAAdapter = {
        ...raw,
        path: adapterPath,
        sizeBytes: blob.length,
        createdAt: new Date()
      };

      this.adapters.set(adapter.id, adapter);
      this.weights.set(adapter.id, weights);
      this._persistAdapter(adapter, weights);
      console.log(`[LoRAManager] Imported adapter ${adapter.id}`);
      return adapter;
    } catch (e: any) {
      console.warn(`[LoRAManager] Import failed: ${e.message}`);
      return null;
    }
  }

  // ── Signing & Versioning ──────────────────────────────────────────────────

  /** Sign an adapter with a private key (stub: deterministic hash-based) */
  signAdapter(adapterId: string, _privateKey?: string): LoRAAdapter | null {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) return null;
    const signed: LoRAAdapter = {
      ...adapter,
      signature: this._stubSign(adapter.hash, adapterId)
    };
    this.adapters.set(adapterId, signed);
    return signed;
  }

  /** Verify an adapter's signature */
  verifyAdapter(adapterId: string, _publicKey?: string): boolean {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) return false;
    const expected = this._stubSign(adapter.hash, adapterId);
    return adapter.signature === expected;
  }

  /** Store arbitrary metadata as a JSON sidecar */
  storeMetadata(adapterId: string, meta: Record<string, any>): void {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) return;
    const sidecarPath = adapter.path.replace('.json', '.meta.json');
    fs.writeFileSync(sidecarPath, JSON.stringify(meta, null, 2), 'utf8');
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  getAdapter(adapterId: string): LoRAAdapter | undefined {
    return this.adapters.get(adapterId);
  }

  listAdapters(): LoRAAdapter[] {
    return Array.from(this.adapters.values());
  }

  /** Returns the latest adapter's weight map (for use by strategies) */
  getLatestAdapterWeights(): Record<string, number[]> {
    const adapters = this.listAdapters().sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
    if (adapters.length === 0) return { delta: [0.0] };
    return this.weights.get(adapters[0]!.id) ?? { delta: [0.0] };
  }

  /** Update adapter weights (used by LocalTrainer after a training epoch) */
  updateAdapterWeights(adapterId: string, newWeights: Record<string, number[]>): void {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) return;
    this.weights.set(adapterId, newWeights);
    const newHash = this._hashWeights(newWeights);
    const updated: LoRAAdapter = { ...adapter, hash: newHash, signature: this._stubSign(newHash, adapterId) };
    this.adapters.set(adapterId, updated);
    this._persistAdapter(updated, newWeights);
  }

  getAdapterCount(): number {
    return this.adapters.size;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _persistAdapter(adapter: LoRAAdapter, weights: Record<string, number[]>): void {
    this._ensureDir(this.loraDir);
    fs.writeFileSync(adapter.path, JSON.stringify({ adapter, weights }, null, 2), 'utf8');
  }

  private _loadExistingAdapters(): void {
    if (!fs.existsSync(this.loraDir)) return;
    for (const file of fs.readdirSync(this.loraDir).filter(f => f.endsWith('.json') && !f.endsWith('.meta.json'))) {
      this.loadAdapter(path.join(this.loraDir, file));
    }
  }

  private _hashWeights(weights: Record<string, number[]>): string {
    return createHash('sha256')
      .update(JSON.stringify(weights, Object.keys(weights).sort()))
      .digest('hex');
  }

  private _stubSign(hash: string, id: string): string {
    return createHash('sha256').update(`ecdsa-stub:${hash}:${id}`).digest('hex').slice(0, 64);
  }

  private _ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}
