import { KnowledgeObject, ExperienceObject } from '../types/index.js';
export declare class CollectiveMemory {
    private knowledgeStore;
    private experienceStore;
    storeKnowledge(obj: KnowledgeObject): void;
    storeExperience(exp: ExperienceObject): void;
    getLatestKnowledge(id: string): KnowledgeObject | undefined;
    searchKnowledge(domain?: string, category?: string): KnowledgeObject[];
    listExperiences(): ExperienceObject[];
}
