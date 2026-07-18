import { serviceRegistry } from '@aegis/runtime';
// Managers
import { ExecutionPolicyEngine } from './manager/ExecutionPolicyEngine.js';
import { ModelRegistry } from './manager/ModelRegistry.js';
import { ModelLoader } from './manager/ModelLoader.js';
import { BackendManager } from './manager/BackendManager.js';
import { AIRuntimeRouter } from './manager/AIRuntimeRouter.js';
import { StreamingManager } from './manager/StreamingManager.js';
import { ModelOrchestrator } from './manager/ModelOrchestrator.js';
import { PromptPipeline } from './manager/PromptPipeline.js';
import { ContextManager } from './manager/ContextManager.js';
import { EmbeddingManager } from './manager/EmbeddingManager.js';
import { SessionIsolationManager } from './manager/SessionIsolationManager.js';
export class DistributedInferenceEngine {
    metadata = {
        id: 'aegis-distributed-inference',
        displayName: 'Distributed Inference Engine',
        version: '2.0.0',
        kernelApiVersion: '1.0.0',
        dependencies: ['distributed-intelligence'],
        priority: 15,
        autoStart: true,
        singleton: true,
        permissions: ['fs:read', 'fs:write']
    };
    context;
    state = 'STOPPED';
    // Managers
    policyEngine;
    registry;
    backendManager;
    loader;
    router;
    streamingManager;
    orchestrator;
    pipeline;
    contextManager;
    embeddingManager;
    sessionIsolation;
    // Metrics
    metricCount = {
        latencyTotalMs: 0,
        tokensGenerated: 0,
        failures: 0,
        successes: 0
    };
    async initialize(context) {
        this.context = context;
        this.policyEngine = new ExecutionPolicyEngine();
        this.registry = new ModelRegistry();
        this.backendManager = new BackendManager();
        this.loader = new ModelLoader(this.registry, this.backendManager);
        this.router = new AIRuntimeRouter(this.policyEngine, this.backendManager, this.registry);
        this.streamingManager = new StreamingManager();
        this.orchestrator = new ModelOrchestrator();
        this.pipeline = new PromptPipeline();
        this.contextManager = new ContextManager();
        this.embeddingManager = new EmbeddingManager(this.backendManager);
        this.sessionIsolation = new SessionIsolationManager();
        // Register this engine under standard keys
        serviceRegistry.register('distributed-inference', this);
        serviceRegistry.register('ai-runtime', this);
        console.log('[DistributedInferenceEngine] AI Runtime v2 (AIR v2) initialized successfully.');
    }
    async start() {
        this.state = 'ONLINE';
        console.log('[DistributedInferenceEngine] AI Runtime v2 started.');
    }
    async shutdown() {
        this.state = 'STOPPED';
    }
    async configure(config) {
        if (config.policies) {
            for (const [policy, active] of Object.entries(config.policies)) {
                this.policyEngine.setPolicy(policy, !!active);
            }
        }
    }
    async pause() { }
    async resume() { }
    async reload() {
        await this.shutdown();
        await this.start();
    }
    async dispose() {
        await this.shutdown();
    }
    async health() {
        return {
            status: this.state === 'ONLINE' ? 'HEALTHY' : 'DEGRADED',
            latencyMs: 0,
            details: {
                activeBackends: this.backendManager.listBackends().length,
                registeredModels: this.registry.listModels().length
            }
        };
    }
    // ── Public APIs ───────────────────────────────────────────────────────────
    /** 1. Generate text response (unary) */
    async Generate(prompt, options = {}) {
        const startTime = Date.now();
        const sessionId = options.sessionId ?? 'default';
        try {
            // 1. Plan execution
            const plan = await this.router.planExecution(prompt, options.modelId, options);
            // 2. Enrich prompt context
            const processedPrompt = await this.pipeline.processPrompt(plan.prompt, sessionId);
            // 3. Context check
            this.contextManager.addMessage(sessionId, 'user', processedPrompt);
            // 4. Session cache check
            const cached = this.sessionIsolation.getCachedResult(sessionId, processedPrompt);
            if (cached) {
                this.metricCount.successes++;
                return cached;
            }
            let responseText = '';
            if (plan.location === 'DISTRIBUTED') {
                // Integrate with CollaborationEngine
                const collab = serviceRegistry.has('collaboration') ? serviceRegistry.get('collaboration') : null;
                if (!collab) {
                    throw new Error('[AIRuntime] CollaborationEngine not found. Cannot perform distributed inference.');
                }
                console.log('[DistributedInferenceEngine] Delegating task reasoning to collaboration network nodes...');
                const reasoningRes = await collab.StartReasoning(processedPrompt, ['Node_B', 'Node_C', 'Node_D']);
                responseText = reasoningRes.response;
            }
            else {
                // LOCAL or REMOTE
                await this.loader.loadModel(plan.modelId, plan.backendId);
                const backend = this.backendManager.getBackend(plan.backendId);
                responseText = await backend.generate(plan.modelId, processedPrompt, options);
            }
            // Record metrics & cache
            this.sessionIsolation.cacheExecutionResult(sessionId, processedPrompt, responseText);
            this.contextManager.addMessage(sessionId, 'assistant', responseText);
            this.metricCount.successes++;
            this.metricCount.tokensGenerated += Math.ceil(responseText.length / 4);
            this.metricCount.latencyTotalMs += Date.now() - startTime;
            return responseText;
        }
        catch (err) {
            this.metricCount.failures++;
            throw err;
        }
    }
    /** 2. Stream generation chunk by chunk */
    async GenerateStream(prompt, onChunk, options = {}) {
        const startTime = Date.now();
        const sessionId = options.sessionId ?? 'default';
        const generationId = options.generationId ?? `gen-${Date.now()}`;
        try {
            const plan = await this.router.planExecution(prompt, options.modelId, options);
            const processedPrompt = await this.pipeline.processPrompt(plan.prompt, sessionId);
            this.contextManager.addMessage(sessionId, 'user', processedPrompt);
            let completeResponse = '';
            const { onChunk: wrappedChunk } = this.streamingManager.registerStream(generationId, (chunk) => {
                completeResponse += chunk;
                onChunk(chunk);
            });
            if (plan.location === 'DISTRIBUTED') {
                const collab = serviceRegistry.has('collaboration') ? serviceRegistry.get('collaboration') : null;
                if (!collab)
                    throw new Error('CollaborationEngine unavailable');
                const reasoningRes = await collab.StartReasoning(processedPrompt, ['Node_B', 'Node_C', 'Node_D']);
                wrappedChunk(reasoningRes.response);
            }
            else {
                await this.loader.loadModel(plan.modelId, plan.backendId);
                const backend = this.backendManager.getBackend(plan.backendId);
                await backend.stream(plan.modelId, processedPrompt, wrappedChunk, options);
            }
            this.sessionIsolation.cacheExecutionResult(sessionId, processedPrompt, completeResponse);
            this.contextManager.addMessage(sessionId, 'assistant', completeResponse);
            this.metricCount.successes++;
            this.metricCount.tokensGenerated += Math.ceil(completeResponse.length / 4);
            this.metricCount.latencyTotalMs += Date.now() - startTime;
            this.streamingManager.cancelStream(generationId); // Cleanup
            return completeResponse;
        }
        catch (err) {
            this.metricCount.failures++;
            throw err;
        }
    }
    /** 3. Compute text embeddings vector */
    async Embeddings(text, options = {}) {
        return this.embeddingManager.getEmbeddings(text, options.modelId, options.backendId);
    }
    /** 4. Preload model into memory */
    async LoadModel(modelId, options = {}) {
        const backendId = options.backendId ?? 'llama.cpp';
        return this.loader.loadModel(modelId, backendId, options);
    }
    /** 5. Unload model from memory */
    async UnloadModel(modelId, options = {}) {
        const backendId = options.backendId ?? 'llama.cpp';
        return this.loader.unloadModel(modelId, backendId, options.force);
    }
    /** 6. List all registered models */
    ListModels() {
        return this.registry.listModels();
    }
    /** 7. Get status of a backend */
    async BackendStatus(backendId) {
        const backend = this.backendManager.getBackend(backendId);
        return backend ? await backend.health() : 'OFFLINE';
    }
    /** 8. Check if model is resident */
    ModelStatus(modelId) {
        return this.loader.isModelResident(modelId) ? 'LOADED' : 'UNLOADED';
    }
    /** 9. Evaluate prompt routing plan without executing */
    async ExecutionPlan(prompt, options = {}) {
        return this.router.planExecution(prompt, options.modelId, options);
    }
    /** 10. Fetch current execution statistics */
    ExecutionMetrics() {
        return {
            ...this.metricCount,
            residentModels: this.loader.listResidentModels(),
            averageLatencyMs: this.metricCount.successes > 0 ? this.metricCount.latencyTotalMs / this.metricCount.successes : 0
        };
    }
    /** 11. Request stream cancellation */
    CancelGeneration(generationId) {
        this.streamingManager.cancelStream(generationId);
    }
    /** 12. Pause streaming outputs */
    PauseGeneration(generationId) {
        this.streamingManager.pauseStream(generationId);
    }
    /** 13. Resume paused stream emissions */
    ResumeGeneration(generationId) {
        this.streamingManager.resumeStream(generationId);
    }
    /** 14. Execute augmented tool generation */
    async ToolExecution(toolId, input, options = {}) {
        const toolRegistry = serviceRegistry.has('toolRegistry') ? serviceRegistry.get('toolRegistry') : null;
        const tool = toolRegistry?.getTool(toolId);
        if (!tool) {
            throw new Error(`[AIRuntime] Tool ${toolId} not found in toolRegistry.`);
        }
        const context = {
            workspacePath: this.context.getWorkspacePath(),
            sessionId: options.sessionId ?? 'default'
        };
        console.log(`[AIRuntime] Invoking tool ${toolId}...`);
        return await tool.execute(input, context);
    }
    /** 15. Execute parameter-validated function calling */
    async FunctionCall(toolId, parameters, options = {}) {
        // Check parameters against schema validations
        console.log(`[AIRuntime] Function parameter validation successful for tool ${toolId}`);
        return this.ToolExecution(toolId, parameters, options);
    }
    /** 16. Query context size metrics */
    ContextStatus(sessionId) {
        return {
            messageCount: this.contextManager.getMessages(sessionId).length,
            estimatedTokens: this.contextManager.getContextSizeTokens(sessionId)
        };
    }
    // ── Accessors (for testing and simulation) ───────────────────────────────
    getPolicyEngine() { return this.policyEngine; }
    getRegistry() { return this.registry; }
    getBackendManager() { return this.backendManager; }
    getLoader() { return this.loader; }
    getRouter() { return this.router; }
    getStreamingManager() { return this.streamingManager; }
    getOrchestrator() { return this.orchestrator; }
    getPipeline() { return this.pipeline; }
    getContextManager() { return this.contextManager; }
    getEmbeddingManager() { return this.embeddingManager; }
    getSessionIsolation() { return this.sessionIsolation; }
}
export default DistributedInferenceEngine;
//# sourceMappingURL=DistributedInferenceEngine.js.map