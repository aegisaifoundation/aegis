import { ReputationMetrics } from '../types/index.js';
export declare class ReputationManager {
    private reputationStore;
    constructor(localNodeId: string);
    getReputation(nodeId: string): ReputationMetrics;
    recordContribution(nodeId: string, success: boolean): void;
    recordReasoningOutcome(nodeId: string, accuracy: number): void;
    recordAvailability(nodeId: string, available: boolean): void;
    private _defaultMetrics;
}
