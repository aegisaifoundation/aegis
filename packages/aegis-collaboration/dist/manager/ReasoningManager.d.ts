import type { ConsensusManager } from './ConsensusManager.js';
export declare class ReasoningManager {
    private readonly consensusManager;
    constructor(consensusManager: ConsensusManager);
    splitTask(prompt: string): Promise<string[]>;
    runReasoning(prompt: string, nodes: string[], consensusMechanism?: 'majority' | 'weighted_trust' | 'weighted_reputation' | 'contribution'): Promise<{
        response: string;
        consensusScore: number;
        votes: {
            nodeId: string;
            approve: boolean;
            confidence: number;
        }[];
    }>;
}
