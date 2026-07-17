import { test, describe } from 'node:test';
import assert from 'node:assert';
import { CollectiveIntelligenceEngine } from '../CollectiveIntelligenceEngine.js';
import { CollectiveIntelligenceSimulation } from '../simulation/CollectiveIntelligenceSimulation.js';
describe('AEGIS Collective Intelligence Engine Tests', () => {
    const mockCtx = {
        getWorkspacePath: () => './workspace/test-collective',
        runtimeId: 'node-test'
    };
    test('Metadata validation', () => {
        const engine = new CollectiveIntelligenceEngine();
        assert.strictEqual(engine.metadata.id, 'aegis-collective-intelligence');
        assert.strictEqual(engine.metadata.singleton, true);
    });
    test('Experience Recording and Reflection', async () => {
        const engine = new CollectiveIntelligenceEngine();
        await engine.initialize(mockCtx);
        const exp = engine.RecordExperience('task-999', 'Optimize database queries', ['Trace step 1: run index analyzer', 'Trace step 2: create composite index'], ['IndexTool'], ['llama-3'], ['programming'], 'success', 1500, 0.95, 0.88, 'Excellent latency improvement');
        assert.strictEqual(exp.outcome, 'success');
        assert.strictEqual(exp.successScore, 0.95);
        // Reflect
        const ref = engine.Reflect(exp.id);
        assert.strictEqual(ref.promoteToReusableKnowledge, true);
        assert.deepStrictEqual(ref.whatSucceeded, ['Completed goal: "Optimize database queries"']);
    });
    test('Knowledge Distillation and Validation', async () => {
        const engine = new CollectiveIntelligenceEngine();
        await engine.initialize(mockCtx);
        const exp = engine.RecordExperience('task-100', 'Diagnose patient symptoms', ['Retrieve logs', 'Check credentials'], ['MedicalScanner'], ['llama-3'], ['medical'], 'success', 2000, 0.9, 0.92);
        const ref = engine.Reflect(exp.id);
        // Distill
        const ko = engine.DistillKnowledge(exp.id, ref.id, 'medical', 'diagnostics');
        assert.strictEqual(ko.domain, 'medical');
        assert.strictEqual(ko.version, '1.0.0');
        // Validate
        const isValid = engine.ValidateKnowledge(ko.id);
        assert.strictEqual(isValid, true);
    });
    test('Emergent Node Specialization', async () => {
        const engine = new CollectiveIntelligenceEngine();
        await engine.initialize(mockCtx);
        assert.strictEqual(engine.Specialization(), 'Generalist');
        // Run 8 successful medical tasks to grow expertise
        for (let i = 0; i < 8; i++) {
            engine.RecordExperience(`task-med-${i}`, 'Analyze diagnostic notes', ['Check values'], ['OCR'], ['llama-3'], ['medical'], 'success', 800, 0.9, 0.85);
        }
        const specRole = engine.Specialization();
        assert.strictEqual(specRole, 'Medical Specialist');
    });
    test('Knowledge Graph mapping', async () => {
        const engine = new CollectiveIntelligenceEngine();
        await engine.initialize(mockCtx);
        const graph = engine.getGraphManager();
        graph.addEdge('Node_1', 'Node_2', 'collaborates_with');
        const edges = engine.KnowledgeGraph();
        assert.strictEqual(edges.length, 1);
        assert.strictEqual(edges[0].relation, 'collaborates_with');
    });
    test('Workflow Recommendations', async () => {
        const engine = new CollectiveIntelligenceEngine();
        await engine.initialize(mockCtx);
        // Pre-seed some knowledge
        const exp = engine.RecordExperience('task-x', 'Optimize python runtime', ['Optimize python'], [], [], ['programming'], 'success', 1000, 0.95, 0.9);
        const ref = engine.Reflect(exp.id);
        const ko = engine.DistillKnowledge(exp.id, ref.id, 'programming', 'optimizations');
        const recs = engine.Recommendations('Need to speed up code compiler', 'programming');
        assert.strictEqual(recs.suggestedModelId, 'llama-3');
        assert.ok(recs.strategyReasoning.includes('Leveraging collective experience'));
    });
    test('End-to-End Collective Intelligence Simulation', async () => {
        const sim = new CollectiveIntelligenceSimulation();
        const results = await sim.runSimulation();
        assert.strictEqual(results.nodeASpecialization, 'Programming Specialist');
        assert.strictEqual(results.nodeBSpecialization, 'Medical Specialist');
        assert.ok(results.totalExperiencesNodeA > 0);
        assert.ok(results.distilledKnowledgeObjects > 0);
        assert.strictEqual(results.recommendedModelNodeA, 'llama-3');
    });
});
