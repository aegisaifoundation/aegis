import { ConsensusVote } from '../types/index.js';
export type ConsensusMechanism = 'majority' | 'weighted_trust' | 'weighted_reputation' | 'contribution';
export declare class ConsensusManager {
    /**
     * Determine consensus outcome for a set of votes.
     */
    evaluateConsensus(votes: ConsensusVote[], mechanism: ConsensusMechanism, nodeWeights?: Record<string, number>): {
        approved: boolean;
        consensusScore: number;
    };
}
