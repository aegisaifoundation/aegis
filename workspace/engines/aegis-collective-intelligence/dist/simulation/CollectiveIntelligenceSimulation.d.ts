import { CollectiveIntelligenceEngine } from '../CollectiveIntelligenceEngine.js';
export declare class CollectiveIntelligenceSimulation {
    private nodes;
    constructor();
    runSimulation(): Promise<{
        nodeASpecialization: string;
        nodeBSpecialization: string;
        totalExperiencesNodeA: number;
        distilledKnowledgeObjects: number;
        recommendedModelNodeA: string;
    }>;
    getNode(name: string): CollectiveIntelligenceEngine | undefined;
}
