import type { AggregationResult, AuditRecord } from '../types/index.js';
/**
 * AggregationManager
 *
 * Responsible for securely combining updates from multiple participants.
 * Supports FedAvg (default) and is structured to accommodate FedProx
 * and future algorithms as plug-in strategies.
 *
 * Enforces contribution validity — rejected contributors are logged in the
 * immutable audit trail. Never exposes raw contributor data externally.
 */
export declare class AggregationManager {
    private rejectedUpdates;
    private auditLog;
    /**
     * Aggregate a set of weight maps using Federated Averaging (FedAvg).
     * All weight sets are assumed to be equal-importance (uniform weighting).
     *
     * @param roundId    Active round ID
     * @param roundNumber Round sequence number
     * @param weightSets Array of weight maps, one per contributor
     * @param contributors Ordered list of node IDs matching weightSets
     * @param algorithm  Aggregation algorithm (default: 'fedavg')
     */
    aggregateWeights(roundId: string, roundNumber: number, weightSets: Record<string, number[]>[], contributors: string[], algorithm?: 'fedavg' | 'fedprox' | string, options?: Record<string, any>): Promise<AggregationResult>;
    /**
     * Aggregate a set of LoRA delta tensor sets (same mechanism as weight aggregation
     * but semantically specific to LoRA adapters).
     */
    aggregateLoRA(roundId: string, roundNumber: number, loraDeltas: Record<string, number[]>[], contributors: string[], algorithm?: string, options?: Record<string, any>): Promise<AggregationResult>;
    /**
     * Mark a contributor's update as invalid — it will be excluded from aggregation.
     * The rejection is logged immutably.
     */
    rejectInvalidUpdate(nodeId: string, reason: string): void;
    /**
     * Validate whether a node ID is a trusted contributor.
     * Delegates trust verification to the DI TrustService when provided.
     */
    validateContributor(nodeId: string, diTrustService?: any): Promise<boolean>;
    /**
     * Stamp an aggregation result with a deterministic version hash.
     */
    versionResult(result: AggregationResult): string;
    getAuditLog(): AuditRecord[];
    getRejectedUpdates(): Map<string, {
        reason: string;
        timestamp: Date;
    }>;
    clearRoundState(): void;
    /** Federated Averaging: simple uniform mean across all weight sets */
    private _fedAvg;
    /**
     * FedProx: Proximal term regularisation (μ = 0.01 default).
     * Pulls each update closer to the global before averaging,
     * improving convergence in heterogeneous data environments.
     */
    private _fedProx;
    /** Weighted Averaging based on variable node weighting (e.g. sample size, trust, performance) */
    private _weightedAvg;
    private _hashWeights;
    private _auditRecord;
}
//# sourceMappingURL=AggregationManager.d.ts.map