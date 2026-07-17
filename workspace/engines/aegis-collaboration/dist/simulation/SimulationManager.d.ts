import { CollaborationEngine } from '../CollaborationEngine.js';
export declare class SimulationManager {
    private nodes;
    constructor();
    runEndToEndDemo(): Promise<{
        sessionName: string;
        toolExchanged: boolean;
        knowledgeExchanged: boolean;
        reasoningCollected: boolean;
        consensusApproved: boolean;
        trustScoreNodeB: number;
    }>;
    getNode(name: string): CollaborationEngine | undefined;
}
