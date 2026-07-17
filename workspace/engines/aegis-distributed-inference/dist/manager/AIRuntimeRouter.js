export class AIRuntimeRouter {
    policyEngine;
    backendManager;
    registry;
    constructor(policyEngine, backendManager, registry) {
        this.policyEngine = policyEngine;
        this.backendManager = backendManager;
        this.registry = registry;
    }
    async planExecution(prompt, requestedModelId, options = {}) {
        const allowedLocations = this.policyEngine.evaluateAllowedLocations(prompt);
        // Resolve model
        const modelId = requestedModelId ?? (allowedLocations.includes('REMOTE') ? 'gpt-4o' : 'llama-3');
        const meta = this.registry.getModel(modelId);
        if (!meta) {
            throw new Error(`[AIRuntimeRouter] Requested model ${modelId} is not registered in the ModelRegistry.`);
        }
        // Determine execution location matching policy constraints
        let location = 'LOCAL';
        if (modelId.startsWith('gpt')) {
            if (!allowedLocations.includes('REMOTE')) {
                throw new Error(`[AIRuntimeRouter] Execution Policy blocks cloud/remote execution. Cannot load ${modelId}.`);
            }
            location = 'REMOTE';
        }
        else if (allowedLocations.includes('DISTRIBUTED') && options.distributedPreference === true) {
            location = 'DISTRIBUTED';
        }
        else if (!allowedLocations.includes('LOCAL')) {
            if (allowedLocations.includes('REMOTE')) {
                location = 'REMOTE';
            }
            else if (allowedLocations.includes('DISTRIBUTED')) {
                location = 'DISTRIBUTED';
            }
            else {
                throw new Error('[AIRuntimeRouter] Execution Policy has blocked all execution environments.');
            }
        }
        // Resolve backend
        const backendId = this.backendManager.selectOptimalBackend(modelId, allowedLocations);
        let reason = `Routed to ${location} using ${backendId} backend based on policy constraints.`;
        if (this.policyEngine.getActivePolicies().includes('medical')) {
            reason += ' [Medical Policy Active: local/distributed sandboxed reasoning only]';
        }
        return {
            modelId,
            backendId,
            location,
            prompt,
            reason,
            options
        };
    }
}
//# sourceMappingURL=AIRuntimeRouter.js.map