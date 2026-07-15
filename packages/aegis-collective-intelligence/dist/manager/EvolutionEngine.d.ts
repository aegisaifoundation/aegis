import { KnowledgeObject, EvolutionStatus } from '../types/index.js';
export declare class EvolutionEngine {
    private activeList;
    private archivedList;
    private retiredList;
    evaluateKnowledgeLifecycle(objs: KnowledgeObject[]): EvolutionStatus;
    isRetired(id: string): boolean;
}
