import type { ILearningStrategy } from './ILearningStrategy.js';
import type { LearningRound, AggregationResult, IStrategyContext } from '../types/index.js';
/**
 * HierarchicalStrategy — Architecture Placeholder
 *
 * Future: Organises nodes into a tree of aggregation clusters.
 * Leaf nodes train locally → cluster coordinators aggregate locally
 * → a global root coordinator performs final global aggregation.
 *
 * Use cases: Cross-silo federated learning, hospital networks,
 * enterprise federated AI, large-scale edge deployments.
 *
 * Implementation deferred to a future phase.
 * API surface is fixed by ILearningStrategy and will not change.
 */
export declare class HierarchicalStrategy implements ILearningStrategy {
    readonly name = "hierarchical";
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
//# sourceMappingURL=HierarchicalStrategy.d.ts.map