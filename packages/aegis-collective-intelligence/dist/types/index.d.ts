export interface ExperienceObject {
    readonly id: string;
    readonly taskId: string;
    readonly goal: string;
    readonly reasoningTrace: string[];
    readonly toolsUsed: string[];
    readonly modelsUsed: string[];
    readonly policiesApplied: string[];
    readonly outcome: 'success' | 'failure';
    readonly executionTimeMs: number;
    readonly successScore: number;
    readonly confidence: number;
    readonly feedback?: string;
    readonly timestamp: Date;
}
export interface ReflectionSuggestion {
    readonly id: string;
    readonly experienceId: string;
    readonly whatSucceeded: string[];
    readonly whatFailed: string[];
    readonly optimizedStepsCount: number;
    readonly alternativeToolRecommended?: string;
    readonly alternativeModelRecommended?: string;
    readonly reasoningImprovements: string[];
    readonly promoteToReusableKnowledge: boolean;
}
export interface KnowledgeObject {
    readonly id: string;
    readonly category: string;
    readonly domain: string;
    readonly summary: string;
    readonly reasoningPattern: string[];
    readonly confidence: number;
    readonly evidenceCount: number;
    readonly sourceExperiences: string[];
    readonly version: string;
    readonly trustScore: number;
    readonly createdAt: Date;
    readonly signature: string;
    readonly privacyPolicy: string;
    readonly distributionPolicy: string;
}
export interface ExpertiseProfile {
    readonly domain: string;
    expertiseScore: number;
    confidence: number;
    experienceCount: number;
    successRate: number;
    trend: 'improving' | 'stable' | 'declining';
}
export interface EvolutionStatus {
    readonly totalKnowledgeObjects: number;
    readonly activeCount: number;
    readonly archivedCount: number;
    readonly retiredCount: number;
    readonly lastEvaluated: Date;
}
