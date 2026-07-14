import type { ILearningStrategy } from './ILearningStrategy.js';
import type { LearningRound, AggregationResult, IStrategyContext } from '../types/index.js';
/**
 * FederatedLearningStrategy
 *
 * Implements the classic coordinator-based federated learning loop:
 *   1. Coordinator selects participants based on capability advertisement
 *   2. Each participant trains locally and sends encrypted LoRA deltas
 *   3. Coordinator runs FedAvg aggregation
 *   4. Global model is broadcast to all participants
 *
 * Zero transport code. All P2P operations go through IStrategyContext.dis.
 */
export declare class FederatedLearningStrategy implements ILearningStrategy {
    readonly name = "federated";
    private context;
    private pendingWeights;
    private collectionDeadline;
    initialize(context: IStrategyContext): Promise<void>;
    prepareRound(round: LearningRound): Promise<void>;
    selectParticipants(candidates: string[]): Promise<string[]>;
    exchangeUpdates(round: LearningRound): Promise<void>;
    aggregate(round: LearningRound): Promise<AggregationResult>;
    validate(result: AggregationResult): Promise<boolean>;
    publishModel(result: AggregationResult): Promise<void>;
    finishRound(round: LearningRound): Promise<void>;
    shutdown(): Promise<void>;
    private _registerWeightListener;
    private _waitForWeights;
}
//# sourceMappingURL=FederatedLearningStrategy.d.ts.map