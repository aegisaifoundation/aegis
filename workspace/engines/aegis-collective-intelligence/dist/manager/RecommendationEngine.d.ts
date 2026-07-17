import type { CollectiveMemory } from './CollectiveMemory.js';
export interface ExecutionRecommendation {
    readonly suggestedModelId?: string;
    readonly suggestedToolId?: string;
    readonly suggestedWorkflowId?: string;
    readonly strategyReasoning: string;
}
export declare class RecommendationEngine {
    private memory;
    constructor(memory: CollectiveMemory);
    generateRecommendations(prompt: string, domain: string): ExecutionRecommendation;
}
