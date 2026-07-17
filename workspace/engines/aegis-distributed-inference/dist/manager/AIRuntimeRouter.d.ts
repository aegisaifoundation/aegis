import type { ExecutionPolicyEngine, ExecutionLocation } from './ExecutionPolicyEngine.js';
import type { BackendManager } from './BackendManager.js';
import type { ModelRegistry } from './ModelRegistry.js';
export interface ExecutionPlan {
    readonly modelId: string;
    readonly backendId: string;
    readonly location: ExecutionLocation;
    readonly prompt: string;
    readonly reason: string;
    readonly options: Record<string, any>;
}
export declare class AIRuntimeRouter {
    private policyEngine;
    private backendManager;
    private registry;
    constructor(policyEngine: ExecutionPolicyEngine, backendManager: BackendManager, registry: ModelRegistry);
    planExecution(prompt: string, requestedModelId?: string, options?: any): Promise<ExecutionPlan>;
}
