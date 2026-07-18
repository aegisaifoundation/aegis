import { serviceRegistry } from '@aegis/runtime';
import os from 'os';
// Managers
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
export class CollectiveIntelligenceEngine {
    metadata = {
        id: 'aegis-collective-intelligence',
        displayName: 'Collective Intelligence Engine',
        version: '1.0.0',
        kernelApiVersion: '1.0.0',
        dependencies: ['aegis-collaboration'],
        priority: 40,
        autoStart: true,
        singleton: true,
        permissions: ['fs:read', 'fs:write']
    };
    context;
    workspacePath;
    localNodeId;
    // Managers
    experienceEngine;
    reflectionEngine;
    distillationEngine;
    memory;
    reasoningEvolution;
    expertiseManager;
    specializationEngine;
    evolutionEngine;
    validator;
    publisher;
    graphManager;
    experienceGraph;
    insightGenerator;
    recommendationEngine;
    initStartTime = 0;
    async initialize(context) {
        this.initStartTime = Date.now();
        this.context = context;
        this.workspacePath = context.getWorkspacePath();
        this.localNodeId = context.runtimeId ?? os.hostname();
        console.log('[CollectiveIntelligenceEngine] Initializing sub-managers...');
        this.experienceEngine = new ExperienceEngine();
        this.reflectionEngine = new ReflectionEngine();
        this.distillationEngine = new KnowledgeDistillationEngine();
        this.memory = new CollectiveMemory();
        this.reasoningEvolution = new ReasoningEvolutionEngine();
        this.expertiseManager = new ExpertiseManager();
        this.specializationEngine = new SpecializationEngine(this.expertiseManager);
        this.evolutionEngine = new EvolutionEngine();
        this.validator = new KnowledgeValidator();
        this.publisher = new KnowledgePublisher();
        this.graphManager = new KnowledgeGraphManager();
        this.experienceGraph = new ExperienceGraph();
        this.insightGenerator = new InsightGenerator();
        this.recommendationEngine = new RecommendationEngine(this.memory);
        // Register with service registry
        serviceRegistry.register('collective-intelligence', this);
        serviceRegistry.register('collective-intelligence:memory', this.memory);
        serviceRegistry.register('collective-intelligence:expertise', this.expertiseManager);
        console.log('[CollectiveIntelligenceEngine] Sub-managers initialized successfully.');
    }
    async configure(config) { }
    async start() {
        console.log('[CollectiveIntelligenceEngine] Started.');
    }
    async pause() { }
    async resume() { }
    async reload() { }
    async shutdown() {
        console.log('[CollectiveIntelligenceEngine] Shutting down...');
    }
    async dispose() {
        await this.shutdown();
    }
    async health() {
        return {
            status: 'HEALTHY',
            latencyMs: Date.now() - this.initStartTime,
            details: {
                experiencesCount: this.memory.listExperiences().length,
                specialization: this.specializationEngine.getSpecializationRole()
            }
        };
    }
    // ── Public APIs ───────────────────────────────────────────────────────────
    /** 1. Record a completed task execution experience */
    RecordExperience(taskId, goal, reasoningTrace, toolsUsed, modelsUsed, policiesApplied, outcome, executionTimeMs, successScore, confidence, feedback) {
        const exp = this.experienceEngine.recordExperience(taskId, goal, reasoningTrace, toolsUsed, modelsUsed, policiesApplied, outcome, executionTimeMs, successScore, confidence, feedback);
        this.memory.storeExperience(exp);
        this.expertiseManager.recordTaskOutcome(policiesApplied.includes('medical') ? 'medical' : 'programming', outcome === 'success');
        this.experienceGraph.linkExperience(taskId, exp.id, policiesApplied.includes('medical') ? 'medical' : 'programming', outcome);
        return exp;
    }
    /** 2. Reflect on experience to evaluate successes/failures */
    Reflect(experienceId) {
        const exp = this.experienceEngine.getExperience(experienceId);
        if (!exp)
            throw new Error(`Experience ${experienceId} not found`);
        return this.reflectionEngine.reflect(exp);
    }
    /** 3. Distill experience and reflection to reusable Knowledge Object */
    DistillKnowledge(experienceId, reflectionId, domain, category) {
        const exp = this.experienceEngine.getExperience(experienceId);
        const ref = this.reflectionEngine.getReflection(reflectionId);
        if (!exp || !ref)
            throw new Error('Experience or Reflection not found');
        const ko = this.distillationEngine.distill(exp, ref, domain, category);
        this.memory.storeKnowledge(ko);
        this.graphManager.addEdge(exp.id, ko.id, 'distilled_into');
        return ko;
    }
    /** 4. Validate knowledge object compliance and confidence */
    ValidateKnowledge(knowledgeId) {
        const ko = this.memory.getLatestKnowledge(knowledgeId);
        if (!ko)
            return false;
        return this.validator.validateKnowledge(ko);
    }
    /** 5. Publish approved knowledge through Collaboration Engine */
    async PublishKnowledge(knowledgeId) {
        const ko = this.memory.getLatestKnowledge(knowledgeId);
        if (!ko)
            return false;
        if (!this.validator.validateKnowledge(ko)) {
            console.warn(`[CollectiveIntelligenceEngine] Blocked publishing ${knowledgeId}: validation failed`);
            return false;
        }
        return await this.publisher.publishKnowledge(ko);
    }
    /** 6. Search for knowledge in collective memory */
    SearchKnowledge(domain, category) {
        return this.memory.searchKnowledge(domain, category);
    }
    /** 7. Get collective memory stats */
    CollectiveMemory() {
        return {
            experiencesCount: this.memory.listExperiences().length,
            knowledgeCount: this.SearchKnowledge().length
        };
    }
    /** 8. Get evolution and repeated mistake insights */
    ReasoningInsights() {
        return this.reasoningEvolution.detectImprovements(this.memory.listExperiences());
    }
    /** 9. Get domain expertise profile */
    NodeExpertise(domain) {
        return this.expertiseManager.getProfile(domain);
    }
    /** 10. Automatically determine emergent node specialization */
    Specialization() {
        return this.specializationEngine.getSpecializationRole();
    }
    /** 11. Retrieve execution recommendations before starting a task */
    Recommendations(prompt, domain) {
        return this.recommendationEngine.generateRecommendations(prompt, domain);
    }
    /** 12. Retrieve Knowledge Graph edges */
    KnowledgeGraph() {
        return this.graphManager.getEdges();
    }
    /** 13. Retrieve Experience Graph traces */
    ExperienceGraph() {
        return this.experienceGraph.listTraces();
    }
    /** 14. Evaluate lifecycles of distilled knowledge objects */
    EvolutionStatus() {
        return this.evolutionEngine.evaluateKnowledgeLifecycle(this.SearchKnowledge());
    }
    /** 15. Retrieve counts of knowledge objects */
    KnowledgeStatistics() {
        return {
            total: this.SearchKnowledge().length
        };
    }
    /** 16. Retrieve all domain expertise scores */
    ExpertiseStatistics() {
        return this.expertiseManager.listProfiles();
    }
    // ── Accessors (for testing / simulation) ──────────────────────────────────
    getExperienceEngine() { return this.experienceEngine; }
    getReflectionEngine() { return this.reflectionEngine; }
    getDistillationEngine() { return this.distillationEngine; }
    getCollectiveMemory() { return this.memory; }
    getReasoningEvolution() { return this.reasoningEvolution; }
    getExpertiseManager() { return this.expertiseManager; }
    getSpecializationEngine() { return this.specializationEngine; }
    getEvolutionEngine() { return this.evolutionEngine; }
    getValidator() { return this.validator; }
    getPublisher() { return this.publisher; }
    getGraphManager() { return this.graphManager; }
    getExperienceGraph() { return this.experienceGraph; }
    getInsightGenerator() { return this.insightGenerator; }
    getRecommendationEngine() { return this.recommendationEngine; }
}
export default CollectiveIntelligenceEngine;
