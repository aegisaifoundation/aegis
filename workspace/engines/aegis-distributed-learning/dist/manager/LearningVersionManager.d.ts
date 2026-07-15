import type { VersionRecord } from '../types/index.js';
/**
 * LearningVersionManager
 *
 * Tracks versioned entities across the learning engine lifecycle.
 * Supports model, LoRA adapter, knowledge, and aggregation result versions.
 * Maintains parent-child relationships for full lineage tracing.
 * All version records are immutable once created.
 */
export declare class LearningVersionManager {
    /** Primary version store: entityId → ordered version chain */
    private versionStore;
    /** Round history index: roundId → roundNumber */
    private roundHistory;
    /**
     * Creates a new version record for any versioned entity.
     *
     * @param entityId    Unique identifier of the entity being versioned
     * @param entityType  'model' | 'lora' | 'knowledge' | 'aggregation'
     * @param parentId    Parent entity ID (null for first version)
     * @param dataOrHash  Raw data string or pre-computed hash to version
     * @returns The created VersionRecord
     */
    createVersion(entityId: string, entityType: VersionRecord['entityType'], parentId: string | null, dataOrHash: string): VersionRecord;
    /** Get the full version history for an entity (oldest first) */
    getHistory(entityId: string): VersionRecord[];
    /** Get the most recent version for an entity */
    getLatest(entityId: string): VersionRecord | null;
    /** Resolve the parent version record for a given version */
    resolveParent(entityId: string, version: string): VersionRecord | null;
    /**
     * Verify the signature of a version record.
     * Uses the same deterministic stub for verification.
     * Future: replace with real ECDSA public key verification.
     */
    verifySignature(record: VersionRecord): boolean;
    /** Record a completed round in the history index */
    recordRound(roundId: string, roundNumber: number): void;
    /** Get round history as an ordered array */
    getRoundHistory(): {
        roundId: string;
        roundNumber: number;
    }[];
    /** Total number of versioned entities tracked */
    getEntityCount(): number;
    /** Total number of version records across all entities */
    getTotalVersionCount(): number;
}
//# sourceMappingURL=LearningVersionManager.d.ts.map