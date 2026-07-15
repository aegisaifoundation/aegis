import type { ILearningStrategy } from './ILearningStrategy.js';
import type { LearningRound, AggregationResult, IStrategyContext } from '../types/index.js';
/**
 * GossipStrategy — Architecture Placeholder
 *
 * Future: Nodes propagate model updates peer-to-peer via epidemic gossip.
 * No coordinator required. Updates spread exponentially across the network
 * until convergence. Extremely resilient to node failures.
 *
 * Use cases: IoT learning, edge AI with unreliable connectivity,
 * fully decentralised deployments with no stable infrastructure.
 *
 * Implementation deferred to a future phase.
 * API surface is fixed by ILearningStrategy and will not change.
 */
export declare class GossipStrategy implements ILearningStrategy {
    readonly name = "gossip";
    initialize(_context: IStrategyContext): Promise<void>;
    prepareRound(_round: LearningRound): Promise<void>;
    selectParticipants(_candidates: string[]): Promise<string[]>;
    exchangeUpdates(_round: LearningRound): Promise<void>;
    aggregate(_round: LearningRound): Promise<AggregationResult>;
    validate(_result: AggregationResult): Promise<boolean>;
    publishModel(_result: AggregationResult): Promise<void>;
    finishRound(_round: LearningRound): Promise<void>;
    shutdown(): Promise<void>;
}
//# sourceMappingURL=GossipStrategy.d.ts.map