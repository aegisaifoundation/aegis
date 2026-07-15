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
export class HierarchicalStrategy implements ILearningStrategy {
  readonly name = 'hierarchical';

  async initialize(_context: IStrategyContext): Promise<void> {
    console.warn('[HierarchicalStrategy] Architecture placeholder. Not yet implemented.');
  }

  async prepareRound(_round: LearningRound): Promise<void> {
    throw new Error('[HierarchicalStrategy] Not yet implemented.');
  }

  async selectParticipants(_candidates: string[]): Promise<string[]> {
    throw new Error('[HierarchicalStrategy] Not yet implemented.');
  }

  async exchangeUpdates(_round: LearningRound): Promise<void> {
    throw new Error('[HierarchicalStrategy] Not yet implemented.');
  }

  async aggregate(_round: LearningRound): Promise<AggregationResult> {
    throw new Error('[HierarchicalStrategy] Not yet implemented.');
  }

  async validate(_result: AggregationResult): Promise<boolean> {
    throw new Error('[HierarchicalStrategy] Not yet implemented.');
  }

  async publishModel(_result: AggregationResult): Promise<void> {
    throw new Error('[HierarchicalStrategy] Not yet implemented.');
  }

  async finishRound(_round: LearningRound): Promise<void> {
    throw new Error('[HierarchicalStrategy] Not yet implemented.');
  }

  async shutdown(): Promise<void> {}
}
