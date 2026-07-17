import { test, describe } from 'node:test';
import assert from 'node:assert';
import { DistributedInferenceEngine } from '../DistributedInferenceEngine.js';
import { AIRuntimeSimulation } from '../simulation/AIRuntimeSimulation.js';
import { serviceRegistry } from '@aegis/runtime';
describe('AEGIS AI Runtime v2 (AIR v2) Tests', () => {
    const mockCtx = {
        getWorkspacePath: () => './workspace/test-inference',
        runtimeId: 'node-test',
        getLogger: () => ({
            info: () => { },
            error: () => { }
        })
    };
    test('Metadata and initial state', async () => {
        const engine = new DistributedInferenceEngine();
        await engine.initialize(mockCtx);
        assert.strictEqual(engine.metadata.id, 'aegis-distributed-inference');
        assert.strictEqual(engine.ListModels().length, 2);
    });
    test('Policy Engine enforcement', async () => {
        const engine = new DistributedInferenceEngine();
        await engine.initialize(mockCtx);
        const policyEngine = engine.getPolicyEngine();
        // Default policy contains prefer-local
        assert.deepStrictEqual(policyEngine.getActivePolicies(), ['prefer-local']);
        let allowed = policyEngine.evaluateAllowedLocations('hello');
        assert.ok(allowed.includes('LOCAL'));
        // Offline policy: only local allowed
        policyEngine.setPolicy('offline', true);
        allowed = policyEngine.evaluateAllowedLocations('hello');
        assert.deepStrictEqual(allowed, ['LOCAL']);
        // Deactivate offline, test medical policy
        policyEngine.setPolicy('offline', false);
        policyEngine.setPolicy('medical', true);
        allowed = policyEngine.evaluateAllowedLocations('hello');
        assert.ok(allowed.includes('LOCAL'));
        assert.ok(allowed.includes('DISTRIBUTED'));
        assert.ok(!allowed.includes('REMOTE')); // Medical mode blocks remote/cloud
    });
    test('Model Loader caching and refCount', async () => {
        const engine = new DistributedInferenceEngine();
        await engine.initialize(mockCtx);
        const loader = engine.getLoader();
        assert.strictEqual(loader.isModelResident('llama-3'), false);
        // Load twice to increase refCount to 2
        await loader.loadModel('llama-3', 'llama.cpp');
        const loaded = await loader.loadModel('llama-3', 'llama.cpp');
        assert.ok(loaded);
        assert.strictEqual(loader.isModelResident('llama-3'), true);
        // Unload once decrements refCount but stays resident (cache warm)
        const unloadedFirst = await loader.unloadModel('llama-3', 'llama.cpp');
        assert.strictEqual(unloadedFirst, false); // refCount goes 2 -> 1, still resident
        assert.strictEqual(loader.isModelResident('llama-3'), true);
        // Force unload
        const unloadedForce = await loader.unloadModel('llama-3', 'llama.cpp', true);
        assert.strictEqual(unloadedForce, true);
        assert.strictEqual(loader.isModelResident('llama-3'), false);
    });
    test('Stream Manager and cancellation', async () => {
        const engine = new DistributedInferenceEngine();
        await engine.initialize(mockCtx);
        let streamBuffer = '';
        const onChunk = (text) => {
            streamBuffer += text;
        };
        const streamPromise = engine.GenerateStream('Test stream input', onChunk, {
            modelId: 'llama-3',
            generationId: 'gen-test-1'
        });
        // Yield control to the event loop so that the async generation pipeline registers the stream
        await new Promise(r => setTimeout(r, 20));
        // Pause/Resume verification
        engine.PauseGeneration('gen-test-1');
        assert.ok(engine.getStreamingManager().isStreamActive('gen-test-1'));
        engine.ResumeGeneration('gen-test-1');
        const fullResult = await streamPromise;
        assert.ok(fullResult.includes('stream'));
    });
    test('Prompt Pipeline injections and PII redactions', async () => {
        const engine = new DistributedInferenceEngine();
        await engine.initialize(mockCtx);
        const pipeline = engine.getPipeline();
        // Test privacy filter card masking
        const ccPrompt = 'Hello, please charge my card 1234-5678-9012-3456';
        const processed = await pipeline.processPrompt(ccPrompt, 'session-test');
        assert.ok(processed.includes('[REDACTED_PII_CARD]'));
        assert.ok(!processed.includes('1234-5678'));
    });
    test('Distributed Inference integration routing', async () => {
        const engine = new DistributedInferenceEngine();
        await engine.initialize(mockCtx);
        // Register mock collaboration service
        const mockCollaboration = {
            async StartReasoning(prompt, nodes) {
                return {
                    response: 'Diagnostic Output consensus',
                    consensusScore: 1.0
                };
            }
        };
        serviceRegistry.register('collaboration', mockCollaboration);
        engine.getPolicyEngine().setPolicy('allow-distributed', true);
        const result = await engine.Generate('Request medical diagnosis text', { distributedPreference: true });
        assert.strictEqual(result, 'Diagnostic Output consensus');
    });
    test('AIR v2 simulation run sequence', async () => {
        const sim = new AIRuntimeSimulation();
        const results = await sim.runDemoSequence();
        assert.ok(results.localOutput.includes('local model'));
        assert.ok(results.remoteOutput.includes('OpenAI cloud model'));
        assert.ok(results.distributedOutput.includes('ASCIP Collective consensus'));
        assert.strictEqual(results.offlineBlocked, true);
        assert.ok(results.multiModelResponse.includes('Critic'));
    });
});
//# sourceMappingURL=AIRuntime.test.js.map