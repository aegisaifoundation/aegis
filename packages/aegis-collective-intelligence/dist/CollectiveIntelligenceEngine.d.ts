import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';
import { ExperienceEngine } from './manager/ExperienceEngine.js';
import { ReflectionEngine } from './manager/ReflectionEngine.js';
import { KnowledgeDistillationEngine } from './manager/KnowledgeDistillationEngine.js';
import { CollectiveMemory } from './manager/CollectiveMemory.js';
import { ReasoningEvolutionEngine } from './manager/ReasoningEvolutionEngine.js';
import { ExpertiseManager } from './manager/ExpertiseManager.js';
import { SpecializationEngine } from './manager/SpecializationEngine.js';
import { EvolutionEngine } from './manager/EvolutionEngine.js';
import { KnowledgeValidator } from './manager/KnowledgeValidator.js';
import { KnowledgePublisher } from './manager/KnowledgePublisher.js';
import { KnowledgeGraphManager } from './manager/KnowledgeGraphManager.js';
import { ExperienceGraph } from './manager/ExperienceGraph.js';
import { InsightGenerator } from './manager/InsightGenerator.js';
import { RecommendationEngine } from './manager/RecommendationEngine.js';
import { ExperienceObject, ReflectionSuggestion, KnowledgeObject, ExpertiseProfile } from './types/index.js';
export declare class CollectiveIntelligenceEngine implements IEngine {
    readonly metadata: IEngineMetadata;
    private context;
    private workspacePath;
    private localNodeId;
    private experienceEngine;
    private reflectionEngine;
    private distillationEngine;
    private memory;
    private reasoningEvolution;
    private expertiseManager;
    private specializationEngine;
    private evolutionEngine;
    private validator;
    private publisher;
    private graphManager;
    private experienceGraph;
    private insightGenerator;
    private recommendationEngine;
    private initStartTime;
    initialize(context: IRuntimeContext_v1): Promise<void>;
    configure(config: Record<string, any>): Promise<void>;
    start(): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    reload(): Promise<void>;
    shutdown(): Promise<void>;
    dispose(): Promise<void>;
    health(): Promise<EngineHealthReport>;
    /** 1. Record a completed task execution experience */
    RecordExperience(taskId: string, goal: string, reasoningTrace: string[], toolsUsed: string[], modelsUsed: string[], policiesApplied: string[], outcome: 'success' | 'failure', executionTimeMs: number, successScore: number, confidence: number, feedback?: string): ExperienceObject;
    /** 2. Reflect on experience to evaluate successes/failures */
    Reflect(experienceId: string): ReflectionSuggestion;
    /** 3. Distill experience and reflection to reusable Knowledge Object */
    DistillKnowledge(experienceId: string, reflectionId: string, domain: string, category: string): KnowledgeObject;
    /** 4. Validate knowledge object compliance and confidence */
    ValidateKnowledge(knowledgeId: string): boolean;
    /** 5. Publish approved knowledge through Collaboration Engine */
    PublishKnowledge(knowledgeId: string): Promise<boolean>;
    /** 6. Search for knowledge in collective memory */
    SearchKnowledge(domain?: string, category?: string): KnowledgeObject[];
    /** 7. Get collective memory stats */
    CollectiveMemory(): {
        experiencesCount: number;
        knowledgeCount: number;
    };
    /** 8. Get evolution and repeated mistake insights */
    ReasoningInsights(): string[];
    /** 9. Get domain expertise profile */
    NodeExpertise(domain: string): ExpertiseProfile;
    /** 10. Automatically determine emergent node specialization */
    Specialization(): string;
    /** 11. Retrieve execution recommendations before starting a task */
    Recommendations(prompt: string, domain: string): import("./manager/RecommendationEngine.js").ExecutionRecommendation;
    /** 12. Retrieve Knowledge Graph edges */
    KnowledgeGraph(): import("./manager/KnowledgeGraphManager.js").GraphEdge[];
    /** 13. Retrieve Experience Graph traces */
    ExperienceGraph(): import("./manager/ExperienceGraph.js").ExperienceNode[];
    /** 14. Evaluate lifecycles of distilled knowledge objects */
    EvolutionStatus(): Record<string, any>;
    /** 15. Retrieve counts of knowledge objects */
    KnowledgeStatistics(): Record<string, number>;
    /** 16. Retrieve all domain expertise scores */
    ExpertiseStatistics(): ExpertiseProfile[];
    getExperienceEngine(): ExperienceEngine;
    getReflectionEngine(): ReflectionEngine;
    getDistillationEngine(): KnowledgeDistillationEngine;
    getCollectiveMemory(): CollectiveMemory;
    getReasoningEvolution(): ReasoningEvolutionEngine;
    getExpertiseManager(): ExpertiseManager;
    getSpecializationEngine(): SpecializationEngine;
    getEvolutionEngine(): EvolutionEngine;
    getValidator(): KnowledgeValidator;
    getPublisher(): KnowledgePublisher;
    getGraphManager(): KnowledgeGraphManager;
    getExperienceGraph(): ExperienceGraph;
    getInsightGenerator(): InsightGenerator;
    getRecommendationEngine(): RecommendationEngine;
}
export default CollectiveIntelligenceEngine;
