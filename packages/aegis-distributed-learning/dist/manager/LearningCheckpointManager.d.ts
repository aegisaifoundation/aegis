import type { LearningRound, LoRAAdapter } from '../types/index.js';
/**
 * LearningCheckpointManager
 *
 * Serialises and restores learning state to disk, enabling crash recovery,
 * round resumption, and rollback to earlier verified states.
 *
 * Checkpoint directory: <workspace>/learning/checkpoints/
 */
export declare class LearningCheckpointManager {
    private checkpointDir;
    constructor(workspacePath: string);
    /** Serialise the full round state to disk */
    saveRoundCheckpoint(round: LearningRound): Promise<void>;
    /** Restore the most recent checkpoint for a given round */
    restoreRoundCheckpoint(roundId: string): LearningRound | null;
    /** Save per-epoch training state (weights snapshot) */
    saveTrainingCheckpoint(epoch: number, weights: Record<string, number[]>): Promise<string>;
    /** Restore a training checkpoint by ID */
    restoreTrainingCheckpoint(checkpointId: string): {
        epoch: number;
        weights: Record<string, number[]>;
    } | null;
    /** Snapshot a LoRA adapter state (metadata only — never the base model) */
    saveLoRACheckpoint(adapter: LoRAAdapter): Promise<void>;
    /** Restore the latest LoRA checkpoint for a given adapter ID */
    restoreLoRACheckpoint(adapterId: string): LoRAAdapter | null;
    /** Save aggregation results to disk */
    saveAggregationCheckpoint(roundId: string, result: any): Promise<void>;
    /** Restore aggregation checkpoint for a round */
    restoreAggregationCheckpoint(roundId: string): any | null;
    /** Rollback a round to a specific prior checkpoint version */
    rollbackRound(roundId: string, _version?: string): LearningRound | null;
    /** Delete training checkpoints older than maxAgeMs */
    pruneOldCheckpoints(maxAgeMs: number): number;
    private _ensureDir;
}
//# sourceMappingURL=LearningCheckpointManager.d.ts.map