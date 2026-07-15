import { ExperienceObject, ReflectionSuggestion, KnowledgeObject } from '../types/index.js';
export declare class KnowledgeDistillationEngine {
    distill(exp: ExperienceObject, ref: ReflectionSuggestion, domain: string, category: string): KnowledgeObject;
}
