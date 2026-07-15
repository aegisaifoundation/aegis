import { createHash } from 'crypto';
import type { VersionRecord } from '../types/index.js';

/**
 * LearningVersionManager
 *
 * Tracks versioned entities across the learning engine lifecycle.
 * Supports model, LoRA adapter, knowledge, and aggregation result versions.
 * Maintains parent-child relationships for full lineage tracing.
 * All version records are immutable once created.
 */
export class LearningVersionManager {
  /** Primary version store: entityId → ordered version chain */
  private versionStore: Map<string, VersionRecord[]> = new Map();
  /** Round history index: roundId → roundNumber */
  private roundHistory: Map<string, number> = new Map();

  /**
   * Creates a new version record for any versioned entity.
   *
   * @param entityId    Unique identifier of the entity being versioned
   * @param entityType  'model' | 'lora' | 'knowledge' | 'aggregation'
   * @param parentId    Parent entity ID (null for first version)
   * @param dataOrHash  Raw data string or pre-computed hash to version
   * @returns The created VersionRecord
   */
  createVersion(
    entityId: string,
    entityType: VersionRecord['entityType'],
    parentId: string | null,
    dataOrHash: string
  ): VersionRecord {
    const existing = this.versionStore.get(entityId) ?? [];
    const parentVersion = existing.length > 0
      ? existing[existing.length - 1]!.version
      : null;

    const hash = dataOrHash.length === 64 && /^[0-9a-f]+$/.test(dataOrHash)
      ? dataOrHash  // Pre-computed SHA-256 hash
      : createHash('sha256').update(dataOrHash).digest('hex');

    const version: VersionRecord = {
      entityId,
      entityType,
      version: `v${existing.length + 1}.0.0`,
      parentVersion,
      hash,
      // Future: real ECDSA signature; for now a deterministic stub
      signature: createHash('sha256').update(`sig:${hash}:${entityId}`).digest('hex').slice(0, 32),
      createdAt: new Date()
    };

    existing.push(version);
    this.versionStore.set(entityId, existing);

    console.log(`[VersionManager] Created ${entityType} version ${version.version} for ${entityId}`);
    return version;
  }

  /** Get the full version history for an entity (oldest first) */
  getHistory(entityId: string): VersionRecord[] {
    return [...(this.versionStore.get(entityId) ?? [])];
  }

  /** Get the most recent version for an entity */
  getLatest(entityId: string): VersionRecord | null {
    const chain = this.versionStore.get(entityId);
    return chain && chain.length > 0 ? chain[chain.length - 1]! : null;
  }

  /** Resolve the parent version record for a given version */
  resolveParent(entityId: string, version: string): VersionRecord | null {
    const chain = this.versionStore.get(entityId) ?? [];
    const idx = chain.findIndex(v => v.version === version);
    if (idx <= 0) return null;
    return chain[idx - 1] ?? null;
  }

  /**
   * Verify the signature of a version record.
   * Uses the same deterministic stub for verification.
   * Future: replace with real ECDSA public key verification.
   */
  verifySignature(record: VersionRecord): boolean {
    const expected = createHash('sha256')
      .update(`sig:${record.hash}:${record.entityId}`)
      .digest('hex')
      .slice(0, 32);
    return record.signature === expected;
  }

  /** Record a completed round in the history index */
  recordRound(roundId: string, roundNumber: number): void {
    this.roundHistory.set(roundId, roundNumber);
  }

  /** Get round history as an ordered array */
  getRoundHistory(): { roundId: string; roundNumber: number }[] {
    return Array.from(this.roundHistory.entries())
      .map(([roundId, roundNumber]) => ({ roundId, roundNumber }))
      .sort((a, b) => a.roundNumber - b.roundNumber);
  }

  /** Total number of versioned entities tracked */
  getEntityCount(): number {
    return this.versionStore.size;
  }

  /** Total number of version records across all entities */
  getTotalVersionCount(): number {
    let total = 0;
    for (const chain of this.versionStore.values()) total += chain.length;
    return total;
  }
}
