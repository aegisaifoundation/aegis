import { ExperienceObject } from '../types/index.js';
export declare class ExperienceEngine {
    private experiences;
    recordExperience(taskId: string, goal: string, reasoningTrace: string[], toolsUsed: string[], modelsUsed: string[], policiesApplied: string[], outcome: 'success' | 'failure', executionTimeMs: number, successScore: number, confidence: number, feedback?: string): ExperienceObject;
    getExperience(id: string): ExperienceObject | undefined;
    listExperiences(): ExperienceObject[];
}
