import { LoRAManager } from '../../model/LoRAManager.js';
import { ValidationManager } from '../../manager/ValidationManager.js';
import { AggregationManager } from '../../manager/AggregationManager.js';
import { PyTorchBackend } from '../../model/backends/PyTorchBackend.js';
import { LlamaCppBackend } from '../../model/backends/LlamaCppBackend.js';
import { OllamaBackend } from '../../model/backends/OllamaBackend.js';
import { FutureBackend } from '../../model/backends/FutureBackend.js';
import { DistributedLearningEngine } from '../../DistributedLearningEngine.js';
import os from 'os';
import path from 'path';
import fs from 'fs';
let passed = 0;
let failed = 0;
function assert(condition, message) {
    if (condition) {
        console.log(`  ✔ ${message}`);
        passed++;
    }
    else {
        console.error(`  ✘ FAIL: ${message}`);
        failed++;
    }
}
async function test(name, fn) {
    console.log(`\n[Test] ${name}`);
    try {
        await fn();
    }
    catch (e) {
        console.error(`  ✘ EXCEPTION: ${e.message}`);
        failed++;
    }
}
const tmpDir = path.join(os.tmpdir(), `aegis-dl-validation-test-${Date.now()}`);
fs.mkdirSync(tmpDir, { recursive: true });
console.log('═══════════════════════════════════════════════════════');
console.log('TEST: Validation & Aggregation Unit Tests');
console.log('═══════════════════════════════════════════════════════');
await test('ValidationManager checks signature, version and compatibility', async () => {
    const loraMgr = new LoRAManager(tmpDir);
    const valMgr = new ValidationManager(loraMgr);
    const adapter = loraMgr.createAdapter('base-model-v1', {
        rank: 8, alpha: 16, targetModules: ['q_proj', 'v_proj'], dropout: 0.05
    });
    // Verify valid adapter
    const resValid = await valMgr.validateLoRA(adapter);
    assert(resValid.valid, 'Valid adapter validation passes');
    // Verify compatibility check
    const resCompatOk = await valMgr.validateLoRA(adapter, { roundId: 'r1', rank: 8, alpha: 16, baseModelId: 'base-model-v1' });
    assert(resCompatOk.valid, 'Compatible config passes');
    const resRankFail = await valMgr.validateLoRA(adapter, { roundId: 'r1', rank: 16 });
    assert(!resRankFail.valid && resRankFail.reason === 'compatibility_rank_mismatch', 'Rank mismatch gets rejected');
    const resModelFail = await valMgr.validateLoRA(adapter, { roundId: 'r1', baseModelId: 'other-model' });
    assert(!resModelFail.valid && resModelFail.reason === 'compatibility_model_mismatch', 'Base model mismatch gets rejected');
});
await test('ValidationManager duplicate detection works', async () => {
    const loraMgr = new LoRAManager(tmpDir);
    const valMgr = new ValidationManager(loraMgr);
    const adapter = loraMgr.createAdapter('base-model-v1', {
        rank: 4, alpha: 8, targetModules: ['q_proj'], dropout: 0
    });
    const roundConfig = { roundId: 'round-abc', rank: 4, alpha: 8 };
    const firstTry = await valMgr.validateLoRA(adapter, roundConfig);
    assert(firstTry.valid, 'First submission is valid');
    const duplicateTry = await valMgr.validateLoRA(adapter, roundConfig);
    assert(!duplicateTry.valid && duplicateTry.reason === 'duplicate_update_detected', 'Duplicate submission is rejected');
    valMgr.clearRoundCache('round-abc');
    const clearedTry = await valMgr.validateLoRA(adapter, roundConfig);
    assert(clearedTry.valid, 'Validation succeeds after clearing round cache');
});
await test('AggregationManager executes FedAvg, FedProx, Weighted Average, Trust Weighted, Performance Weighted and Adaptive algorithms', async () => {
    const aggMgr = new AggregationManager();
    const w1 = { 'w': [1, 2, 3] };
    const w2 = { 'w': [4, 5, 6] };
    const contributors = ['node-1', 'node-2'];
    // 1. FedAvg
    const avgRes = await aggMgr.aggregateWeights('r1', 1, [w1, w2], contributors, 'fedavg');
    assert(avgRes.resultHash !== undefined, 'FedAvg produces a result hash');
    // 2. FedProx
    const proxRes = await aggMgr.aggregateWeights('r1', 1, [w1, w2], contributors, 'fedprox');
    assert(proxRes.resultHash !== undefined, 'FedProx produces a result hash');
    // 3. Weighted Average (Weighted by dataset sample count)
    const weightedRes = await aggMgr.aggregateWeights('r1', 1, [w1, w2], contributors, 'weighted', { sampleCounts: [100, 200] });
    assert(weightedRes.resultHash !== undefined, 'Weighted produces a result hash');
    // 4. Trust Weighted (Weighted by node trust scores)
    const trustRes = await aggMgr.aggregateWeights('r1', 1, [w1, w2], contributors, 'trust', { trustScores: [0.9, 0.4] });
    assert(trustRes.resultHash !== undefined, 'Trust-weighted produces a result hash');
    // 5. Performance Weighted (Weighted by performance metrics)
    const perfRes = await aggMgr.aggregateWeights('r1', 1, [w1, w2], contributors, 'performance', { performanceScores: [0.95, 0.85] });
    assert(perfRes.resultHash !== undefined, 'Performance-weighted produces a result hash');
    // 6. Adaptive Aggregation (Combines trust and performance dynamically)
    const adaptiveRes = await aggMgr.aggregateWeights('r1', 1, [w1, w2], contributors, 'adaptive', { trustScores: [0.8, 0.9], performanceScores: [0.7, 0.88] });
    assert(adaptiveRes.resultHash !== undefined, 'Adaptive produces a result hash');
});
await test('Training backends execute simulated epochs and yield progress', async () => {
    const pyTorch = new PyTorchBackend();
    const llamaCpp = new LlamaCppBackend();
    const ollama = new OllamaBackend();
    const future = new FutureBackend();
    let pyTorchProgressCalls = 0;
    const resPyTorch = await pyTorch.train('m1', {}, {
        epochs: 2,
        onProgress: () => { pyTorchProgressCalls++; }
    });
    assert(resPyTorch.metrics.epochsCompleted === 2, 'PyTorch runs configured epochs');
    assert(pyTorchProgressCalls === 2, 'PyTorch calls progress callback for each epoch');
    assert(resPyTorch.weights['q_proj'] !== undefined, 'PyTorch outputs projections');
    const resLlama = await llamaCpp.train('m1', {}, { epochs: 1 });
    assert(resLlama.metrics.epochsCompleted === 1, 'LlamaCpp runs configured epochs');
    const resOllama = await ollama.train('m1', {}, { epochs: 1 });
    assert(resOllama.metrics.epochsCompleted === 1, 'Ollama runs configured epochs');
    const resFuture = await future.train('m1', {}, { epochs: 1 });
    assert(resFuture.metrics.epochsCompleted === 1, 'Future runs configured epochs');
});
await test('DistributedLearningEngine exposes required public APIs', async () => {
    const engine = new DistributedLearningEngine();
    const mockContext = {
        getWorkspacePath: () => tmpDir,
        runtimeId: 'test-node-1'
    };
    await engine.initialize(mockContext);
    await engine.start();
    // Test public API: CreateLearningRound
    const round = engine.CreateLearningRound('federated');
    assert(round !== undefined, 'CreateLearningRound returns a round');
    assert(round.status === 'PENDING', 'Created round status is PENDING');
    // Test public API: JoinLearningRound
    const joined = await engine.JoinLearningRound(round.roundId, 'peer-leader');
    // It will be ROUND_ACTIVE state inside learningManager now
    assert(joined, 'JoinLearningRound succeeds');
    // Test public API: LeaveLearningRound
    await engine.LeaveLearningRound();
    assert(engine.RoundStatus() === 'IDLE', 'RoundStatus is IDLE after leaving');
    // Test public API: TrainLocalModel
    const metrics = await engine.TrainLocalModel('llama-3', { epochs: 2 });
    assert(metrics.epochsCompleted === 2, 'TrainLocalModel runs training');
    // Test public API: Export / Import / Merge LoRA
    const localTrainer = engine.getLocalTrainer();
    const loraConfig = { rank: 4, alpha: 16, targetModules: ['q_proj'], dropout: 0 };
    const { adapterId } = await localTrainer.trainLoRA('llama-3', loraConfig, 1);
    const exported = engine.ExportLoRA(adapterId);
    assert(exported !== null, 'ExportLoRA outputs blob');
    const imported = engine.ImportLoRA(exported);
    assert(imported !== null && imported.id === adapterId, 'ImportLoRA parses exported blob');
    const baseWeights = { 'q_proj': [1.0, 1.0, 1.0, 1.0] };
    const merged = engine.MergeLoRA(baseWeights, adapterId);
    assert(merged['q_proj'] !== undefined, 'MergeLoRA returns merged weights');
    // Test public API: ValidateLoRA
    const validation = await engine.ValidateLoRA(imported);
    assert(validation.valid, 'ValidateLoRA validates imported LoRA adapter');
    // Test public API: TrainingStatus
    const status = engine.TrainingStatus();
    assert(status !== undefined, 'TrainingStatus returns training progress');
    // Test public API: LearningMetrics
    const learningMetrics = engine.LearningMetrics();
    assert(learningMetrics.completedRounds !== undefined, 'LearningMetrics returns stats');
    // Test public API: LearningHistory
    const history = engine.LearningHistory();
    assert(Array.isArray(history), 'LearningHistory returns history list');
    // Test public API: CheckpointHistory
    const checkpoints = engine.CheckpointHistory();
    assert(checkpoints.roundHistory !== undefined, 'CheckpointHistory returns checkpoint list');
    await engine.shutdown();
});
console.log('\n═══════════════════════════════════════════════════════');
console.log(`Validation & Aggregation Tests: ${passed} passed, ${failed} failed.`);
console.log('═══════════════════════════════════════════════════════\n');
if (failed > 0)
    process.exit(1);
//# sourceMappingURL=ValidationAndAggregationTest.js.map