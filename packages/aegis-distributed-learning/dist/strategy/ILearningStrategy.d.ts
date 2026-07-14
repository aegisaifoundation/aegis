import type { LearningRound, AggregationResult, IStrategyContext } from '../types/index.js';
/**
 * ILearningStrategy
 *
 * Every distributed learning algorithm must implement this interface.
 * Strategies own the algorithm — they never own transport or networking.
 * All P2P operations are delegated via IStrategyContext → DI Engine services.
 *
 * Lifecycle per round:
 *   initialize → prepareRound → selectParticipants → exchangeUpdates
 *     → aggregate → validate → publishModel → finishRound
 */
export interface ILearningStrategy {
    /** Human-readable strategy identifier (e.g. 'federated', 'swarm') */
    readonly name: string;
    /**
     * Called once when the strategy is first attached to the engine.
     * Use to set up event listeners and one-time state.
     */
    initialize(context: IStrategyContext): Promise<void>;
    /**
     * Called at the start of each round before collecting updates.
     * Implementations prepare local model state, clear metrics, etc.
     */
    prepareRound(round: LearningRound): Promise<void>;
    /**
     * Selects which peer node IDs should participate in this round.
     * Receives full candidate list from DiscoveryService; returns filtered subset.
     */
    selectParticipants(candidates: string[]): Promise<string[]>;
    /**
     * Broadcasts round invitation and collects local updates from participants.
     * All messaging goes through IStrategyContext.dis.messagingService.
     */
    exchangeUpdates(round: LearningRound): Promise<void>;
    /**
     * Aggregates all collected updates into a single result.
     * Delegates weight / LoRA averaging to AggregationManager.
     */
    aggregate(round: LearningRound): Promise<AggregationResult>;
    /**
     * Validates the aggregation result (contributor trust, hash integrity).
     * Returns false if the result should be discarded and the round retried.
     */
    validate(result: AggregationResult): Promise<boolean>;
    /**
     * Publishes the validated global model to all participants.
     * Uses IStrategyContext.dis.eventService for broadcast.
     */
    publishModel(result: AggregationResult): Promise<void>;
    /**
     * Finalises the round: checkpointing, metric recording, cleanup.
     */
    finishRound(round: LearningRound): Promise<void>;
    /**
     * Tears down any persistent listeners or state held by this strategy.
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=ILearningStrategy.d.ts.map