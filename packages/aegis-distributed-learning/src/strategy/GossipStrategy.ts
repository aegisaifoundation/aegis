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
export class GossipStrategy implements ILearningStrategy {
  readonly name = 'gossip';

  async initialize(_context: IStrategyContext): Promise<void> {
    console.warn('[GossipStrategy] Architecture placeholder. Not yet implemented.');
  }

  async prepareRound(_round: LearningRound): Promise<void> {
    throw new Error('[GossipStrategy] Not yet implemented.');
  }

  async selectParticipants(_candidates: string[]): Promise<string[]> {
    throw new Error('[GossipStrategy] Not yet implemented.');
  }

  async exchangeUpdates(_round: LearningRound): Promise<void> {
    throw new Error('[GossipStrategy] Not yet implemented.');
  }

  async aggregate(_round: LearningRound): Promise<AggregationResult> {
    throw new Error('[GossipStrategy] Not yet implemented.');
  }

  async validate(_result: AggregationResult): Promise<boolean> {
    throw new Error('[GossipStrategy] Not yet implemented.');
  }

  async publishModel(_result: AggregationResult): Promise<void> {
    throw new Error('[GossipStrategy] Not yet implemented.');
  }

  async finishRound(_round: LearningRound): Promise<void> {
    throw new Error('[GossipStrategy] Not yet implemented.');
  }

  async shutdown(): Promise<void> {}
}
