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
  minParticipants: number = 2;

  /** Maximum number of learning rounds per session before auto-pause */
  maxRoundsPerSession: number = 100;

  /** Milliseconds before a round is automatically timed out */
  roundTimeoutMs: number = 30_000;

  /** Whether to reject round join requests from unverified peers */
  requireTrustVerification: boolean = true;

  /** Aggregation algorithm to use ('fedavg' | 'fedprox') */
  aggregationAlgorithm: 'fedavg' | 'fedprox' = 'fedavg';

  /** Save a training checkpoint every N epochs */
  checkpointFrequency: number = 5;

  /** Allow simulation mode when DI Engine is unavailable */
  allowSimulationMode: boolean = true;

  /** Workspace-relative path where LoRA adapters are stored */
  loraStoragePath: string = 'lora';

  /** Default strategy name used when none is explicitly specified */
  defaultStrategy: string = 'federated';

  /** Maximum retry attempts for a failed round before giving up */
  maxRoundRetries: number = 2;

  /**
   * Apply a partial policy override from the engine's config object.
   * Unknown fields are silently ignored for forward compatibility.
   */
  applyConfig(config: Record<string, any>): void {
    const allowedKeys: (keyof LearningPolicies)[] = [
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
        (this as any)[key] = config[key];
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

  toJSON(): Record<string, any> {
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
