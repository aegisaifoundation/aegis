/**
 * LearningPolicies
 *
 * Runtime-configurable policy set for the Distributed Learning Engine.
 * All policy values have sensible defaults and can be overridden via
 * the engine's configure() call at startup.
 *
 * Policies are immutable after the engine starts a round —
 * policy updates take effect at the next round boundary.
 */
export declare class LearningPolicies {
    /** Minimum participants required to proceed with aggregation */
    minParticipants: number;
    /** Maximum number of learning rounds per session before auto-pause */
    maxRoundsPerSession: number;
    /** Milliseconds before a round is automatically timed out */
    roundTimeoutMs: number;
    /** Whether to reject round join requests from unverified peers */
    requireTrustVerification: boolean;
    /** Aggregation algorithm to use ('fedavg' | 'fedprox') */
    aggregationAlgorithm: 'fedavg' | 'fedprox';
    /** Save a training checkpoint every N epochs */
    checkpointFrequency: number;
    /** Allow simulation mode when DI Engine is unavailable */
    allowSimulationMode: boolean;
    /** Workspace-relative path where LoRA adapters are stored */
    loraStoragePath: string;
    /** Default strategy name used when none is explicitly specified */
    defaultStrategy: string;
    /** Maximum retry attempts for a failed round before giving up */
    maxRoundRetries: number;
    /** Maximum participants allowed in a round */
    maxParticipants: number;
    /** Minimum peer trust score required to participate/accept update */
    minTrust: number;
    /** Minimum accuracy target */
    minAccuracy: number;
    /** Accuracy change threshold for aggregation acceptance */
    aggregationThreshold: number;
    /** Allowed base models list */
    allowedModels: string[];
    /** Allowed LoRA formats list */
    allowedLoraFormats: string[];
    /** Maximum update byte size */
    maxUpdateSize: number;
    /** Simulated resource training budget */
    trainingBudget: number;
    /**
     * Apply a partial policy override from the engine's config object.
     * Unknown fields are silently ignored for forward compatibility.
     */
    applyConfig(config: Record<string, any>): void;
    toJSON(): Record<string, any>;
}
//# sourceMappingURL=LearningPolicies.d.ts.map