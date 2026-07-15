import type { ILearningStrategy } from '../strategy/ILearningStrategy.js';
import type { RoundManager } from './RoundManager.js';
import type { AggregationManager } from './AggregationManager.js';
import type { LearningCheckpointManager } from './LearningCheckpointManager.js';
import type { LearningVersionManager } from './LearningVersionManager.js';
import type { LoRAManager } from '../model/LoRAManager.js';
import type { PrivacyManager } from '../privacy/PrivacyManager.js';
import type { LearningPolicies } from '../policy/LearningPolicies.js';
import type { LearningState, LearningRound } from '../types/index.js';
/**
 * LearningManager
 *
 * Central coordinator for the Distributed Learning Engine.
 * Owns the top-level learning state machine and orchestrates all
 * sub-managers and the active ILearningStrategy.
 *
 * One active round at a time. All networking is delegated to the
 * ILearningStrategy which in turn uses IStrategyContext → DI services.
 */
export declare class LearningManager {
    private readonly roundManager;
    private readonly aggregationManager;
    private readonly checkpointManager;
    private readonly versionManager;
    private readonly loraManager;
    private readonly privacyManager;
    private readonly policies;
    private state;
    private strategies;
    private activeStrategy;
    private activeRound;
    private dis;
    private localNodeId;
    constructor(roundManager: RoundManager, aggregationManager: AggregationManager, checkpointManager: LearningCheckpointManager, versionManager: LearningVersionManager, loraManager: LoRAManager, privacyManager: PrivacyManager, policies: LearningPolicies);
    /** Wire up the DI engine reference and node identity */
    initialize(dis: any | null, localNodeId: string): void;
    /** Register an ILearningStrategy implementation */
    registerStrategy(strategy: ILearningStrategy): void;
    /**
     * Initiate a new learning round.
     *
     * @param strategyName Which strategy to use ('federated' | 'swarm' | ...)
     * @param profileId    Optional learning profile ID
     */
    startRound(strategyName?: string, profileId?: string): Promise<LearningRound>;
    /** Stop the currently active round gracefully */
    stopRound(): Promise<void>;
    /** Join an externally-initiated round as a participant */
    joinRound(roundId: string, leaderId: string): Promise<boolean>;
    /** Leave an active round gracefully */
    leaveRound(): Promise<void>;
    /** Pause the learning engine (flushes checkpoint) */
    pauseLearning(): Promise<void>;
    /** Resume from paused state */
    resumeLearning(): Promise<void>;
    /**
     * Hot-swap the active strategy without restarting the engine.
     * Cannot switch while a round is in progress.
     */
    switchStrategy(name: string): Promise<void>;
    shutdown(): Promise<void>;
    getState(): LearningState;
    getActiveRound(): LearningRound | null;
    getRoundHistory(): LearningRound[];
    getActiveStrategyName(): string | null;
    getRegisteredStrategies(): string[];
    private _buildStrategyContext;
    private _runRound;
}
//# sourceMappingURL=LearningManager.d.ts.map