import { DistributedInferenceEngine } from '../DistributedInferenceEngine.js';
import { serviceRegistry } from '@aegis/runtime';
export class AIRuntimeSimulation {
    nodes = new Map();
    constructor() {
        const nodeNames = ['Node_A', 'Node_B', 'Node_C', 'Node_D'];
        for (const name of nodeNames) {
            const engine = new DistributedInferenceEngine();
            const mockCtx = {
                getWorkspacePath: () => `./workspace/sim-runtime/${name}`,
                runtimeId: name,
                getLogger: () => ({
                    info: () => { },
                    error: () => { }
                })
            };
            engine.initialize(mockCtx);
            this.nodes.set(name, engine);
        }
    }
    async runDemoSequence() {
        console.log('\n[AIRuntimeSimulation] Starting AIR v2 Demo Sequence...');
        const nodeA = this.nodes.get('Node_A');
        // 1. Local Inference (always-local policy active)
        nodeA.getPolicyEngine().setPolicy('always-local', true);
        console.log('[AIRuntimeSimulation] Policy set to always-local. Running Generation...');
        const localOutput = await nodeA.Generate('Prompt requesting local inference');
        // 2. Remote Inference (allow-remote active, always-local deactivated)
        nodeA.getPolicyEngine().setPolicy('always-local', false);
        nodeA.getPolicyEngine().setPolicy('allow-remote', true);
        console.log('[AIRuntimeSimulation] Policy updated to allow-remote. Requesting GPT model...');
        const remoteOutput = await nodeA.Generate('Prompt requesting cloud inference', { modelId: 'gpt-4o' });
        // 3. Offline Mode block verification
        nodeA.getPolicyEngine().setPolicy('offline', true);
        let offlineBlocked = false;
        try {
            await nodeA.Generate('Verify cloud generation under offline mode', { modelId: 'gpt-4o' });
        }
        catch (err) {
            offlineBlocked = true;
            console.log(`[AIRuntimeSimulation] Offline mode block verified: ${err.message}`);
        }
        nodeA.getPolicyEngine().setPolicy('offline', false); // deactivate
        // 4. Distributed Inference (integration placeholder stub)
        // Setup Mock Collaboration Engine in Registry
        const mockCollaboration = {
            async StartReasoning(prompt, nodes) {
                return {
                    response: `[ASCIP Collective consensus response from nodes: ${nodes.join(', ')}]`,
                    consensusScore: 1.0
                };
            }
        };
        serviceRegistry.register('collaboration', mockCollaboration);
        nodeA.getPolicyEngine().setPolicy('allow-remote', false);
        nodeA.getPolicyEngine().setPolicy('allow-distributed', true);
        console.log('[AIRuntimeSimulation] Requesting distributed collective inference...');
        const distributedOutput = await nodeA.Generate('Perform complex collaborative diagnostic query', { distributedPreference: true });
        // 5. Multi-model Orchestration (Planner -> Coder -> Critic)
        nodeA.getPolicyEngine().setPolicy('allow-remote', true);
        console.log('[AIRuntimeSimulation] Executing sequential multi-model orchestration...');
        const orchestrationResult = await nodeA.getOrchestrator().executeOrchestrationWorkflow('Create medical workflow task planning schema', nodeA);
        const multiModelResponse = orchestrationResult.response;
        console.log('[AIRuntimeSimulation] AIR v2 Simulation Demo Sequence Complete.\n');
        return {
            localOutput,
            remoteOutput,
            distributedOutput,
            offlineBlocked,
            multiModelResponse
        };
    }
    getNode(name) {
        return this.nodes.get(name);
    }
}
//# sourceMappingURL=AIRuntimeSimulation.js.map