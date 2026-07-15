import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';
import { ExecutionPolicyEngine } from './manager/ExecutionPolicyEngine.js';
import { ModelRegistry, ModelMetadata } from './manager/ModelRegistry.js';
import { ModelLoader } from './manager/ModelLoader.js';
import { BackendManager } from './manager/BackendManager.js';
import { AIRuntimeRouter, ExecutionPlan } from './manager/AIRuntimeRouter.js';
import { StreamingManager } from './manager/StreamingManager.js';
import { ModelOrchestrator } from './manager/ModelOrchestrator.js';
import { PromptPipeline } from './manager/PromptPipeline.js';
import { ContextManager } from './manager/ContextManager.js';
import { EmbeddingManager } from './manager/EmbeddingManager.js';
import { SessionIsolationManager } from './manager/SessionIsolationManager.js';
export declare class DistributedInferenceEngine implements IEngine {
    readonly metadata: IEngineMetadata;
    private context;
    private state;
    private policyEngine;
    private registry;
    private backendManager;
    private loader;
    private router;
    private streamingManager;
    private orchestrator;
    private pipeline;
    private contextManager;
    private embeddingManager;
    private sessionIsolation;
    private metricCount;
    initialize(context: IRuntimeContext_v1): Promise<void>;
    start(): Promise<void>;
    shutdown(): Promise<void>;
    configure(config: Record<string, any>): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    reload(): Promise<void>;
    dispose(): Promise<void>;
    health(): Promise<EngineHealthReport>;
    /** 1. Generate text response (unary) */
    Generate(prompt: string, options?: any): Promise<string>;
    /** 2. Stream generation chunk by chunk */
    GenerateStream(prompt: string, onChunk: (text: string) => void, options?: any): Promise<string>;
    /** 3. Compute text embeddings vector */
    Embeddings(text: string, options?: any): Promise<number[]>;
    /** 4. Preload model into memory */
    LoadModel(modelId: string, options?: any): Promise<boolean>;
    /** 5. Unload model from memory */
    UnloadModel(modelId: string, options?: any): Promise<boolean>;
    /** 6. List all registered models */
    ListModels(): ModelMetadata[];
    /** 7. Get status of a backend */
    BackendStatus(backendId: string): Promise<string>;
    /** 8. Check if model is resident */
    ModelStatus(modelId: string): string;
    /** 9. Evaluate prompt routing plan without executing */
    ExecutionPlan(prompt: string, options?: any): Promise<ExecutionPlan>;
    /** 10. Fetch current execution statistics */
    ExecutionMetrics(): Record<string, any>;
    /** 11. Request stream cancellation */
    CancelGeneration(generationId: string): void;
    /** 12. Pause streaming outputs */
    PauseGeneration(generationId: string): void;
    /** 13. Resume paused stream emissions */
    ResumeGeneration(generationId: string): void;
    /** 14. Execute augmented tool generation */
    ToolExecution(toolId: string, input: any, options?: any): Promise<string>;
    /** 15. Execute parameter-validated function calling */
    FunctionCall(toolId: string, parameters: any, options?: any): Promise<string>;
    /** 16. Query context size metrics */
    ContextStatus(sessionId: string): Record<string, any>;
    getPolicyEngine(): ExecutionPolicyEngine;
    getRegistry(): ModelRegistry;
    getBackendManager(): BackendManager;
    getLoader(): ModelLoader;
    getRouter(): AIRuntimeRouter;
    getStreamingManager(): StreamingManager;
    getOrchestrator(): ModelOrchestrator;
    getPipeline(): PromptPipeline;
    getContextManager(): ContextManager;
    getEmbeddingManager(): EmbeddingManager;
    getSessionIsolation(): SessionIsolationManager;
}
export default DistributedInferenceEngine;
