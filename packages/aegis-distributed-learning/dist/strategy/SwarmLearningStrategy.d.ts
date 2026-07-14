import type { ILearningStrategy } from './ILearningStrategy.js';
import type { LearningRound, AggregationResult, IStrategyContext } from '../types/index.js';
/**
 * SwarmLearningStrategy
 *
 * Implements decentralised swarm-based learning:
 *   1. All peers are equal — no fixed coordinator
 *   2. Leader is elected dynamically per round (lowest node-ID wins)
 *   3. Every node contributes gradients and receives aggregated output
 *   4. Validation is majority-consensus based
 *
 * Zero transport code. All P2P via IStrategyContext.dis.
 */
export declare class SwarmLearningStrategy implements ILearningStrategy {
    readonly name = "swarm";
    private context;
    private peerWeights;
    private electedLeaderId;
    private leaderAcks;
    initialize(context: IStrategyContext): Promise<void>;
    prepareRound(round: LearningRound): Promise<void>;
    selectParticipants(candidates: string[]): Promise<string[]>;
    exchangeUpdates(round: LearningRound): Promise<void>;
    aggregate(round: LearningRound): Promise<AggregationResult>;
    validate(result: AggregationResult): Promise<boolean>;
    publishModel(result: AggregationResult): Promise<void>;
    finishRound(round: LearningRound): Promise<void>;
    shutdown(): Promise<void>;
    private _registerSwarmListeners;
    /** Deterministic leader election: lowest sorted node ID wins */
    private _electLeader;
    private _awaitPeerGradients;
}
//# sourceMappingURL=SwarmLearningStrategy.d.ts.map