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
export class LearningPolicies {
    /** Minimum participants required to proceed with aggregation */
    minParticipants = 2;
    /** Maximum number of learning rounds per session before auto-pause */
    maxRoundsPerSession = 100;
    /** Milliseconds before a round is automatically timed out */
    roundTimeoutMs = 30_000;
    /** Whether to reject round join requests from unverified peers */
    requireTrustVerification = true;
    /** Aggregation algorithm to use ('fedavg' | 'fedprox') */
    aggregationAlgorithm = 'fedavg';
    /** Save a training checkpoint every N epochs */
    checkpointFrequency = 5;
    /** Allow simulation mode when DI Engine is unavailable */
    allowSimulationMode = true;
    /** Workspace-relative path where LoRA adapters are stored */
    loraStoragePath = 'lora';
    /** Default strategy name used when none is explicitly specified */
    defaultStrategy = 'federated';
    /** Maximum retry attempts for a failed round before giving up */
    maxRoundRetries = 2;
    /**
     * Apply a partial policy override from the engine's config object.
     * Unknown fields are silently ignored for forward compatibility.
     */
    applyConfig(config) {
        const allowedKeys = [
            'minParticipants',
            'maxRoundsPerSession',
            'roundTimeoutMs',
            'requireTrustVerification',
            'aggregationAlgorithm',
            'checkpointFrequency',
            'allowSimulationMode',
            'loraStoragePath',
            'defaultStrategy',
            'maxRoundRetries'
        ];
        for (const key of allowedKeys) {
            if (key in config && config[key] !== undefined) {
                this[key] = config[key];
            }
        }
        console.log('[LearningPolicies] Configuration applied:', {
            minParticipants: this.minParticipants,
            roundTimeoutMs: this.roundTimeoutMs,
            aggregationAlgorithm: this.aggregationAlgorithm,
            requireTrustVerification: this.requireTrustVerification,
            defaultStrategy: this.defaultStrategy
        });
    }
    toJSON() {
        return {
            minParticipants: this.minParticipants,
            maxRoundsPerSession: this.maxRoundsPerSession,
            roundTimeoutMs: this.roundTimeoutMs,
            requireTrustVerification: this.requireTrustVerification,
            aggregationAlgorithm: this.aggregationAlgorithm,
            checkpointFrequency: this.checkpointFrequency,
            allowSimulationMode: this.allowSimulationMode,
            loraStoragePath: this.loraStoragePath,
            defaultStrategy: this.defaultStrategy,
            maxRoundRetries: this.maxRoundRetries
        };
    }
}
//# sourceMappingURL=LearningPolicies.js.map