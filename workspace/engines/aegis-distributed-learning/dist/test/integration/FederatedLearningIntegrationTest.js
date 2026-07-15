/**
 * Integration Tests — Federated Learning Round
 * Runs a complete startRound() cycle with FederatedLearningStrategy
 * using a mock DI service injected via a minimal serviceRegistry stub.
 * Verifies aggregation result shape, version records, and audit trail.
 */
import { LearningManager } from '../../manager/LearningManager.js';
import { RoundManager } from '../../manager/RoundManager.js';
import { AggregationManager } from '../../manager/AggregationManager.js';
import { LearningCheckpointManager } from '../../manager/LearningCheckpointManager.js';
import { LearningVersionManager } from '../../manager/LearningVersionManager.js';
import { LoRAManager } from '../../model/LoRAManager.js';
import { PrivacyManager } from '../../privacy/PrivacyManager.js';
import { LearningPolicies } from '../../policy/LearningPolicies.js';
import { FederatedLearningStrategy } from '../../strategy/FederatedLearningStrategy.js';
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
// ── Mock DI service (simulates connected DI Engine) ───────────────────────────
function buildMockDis() {
    const messageHandlers = new Map();
    return {
        discoveryService: { discoverNodes: async () => ['mock-peer-1', 'mock-peer-2'] },
        capabilityService: {
            getRemoteCapabilities: async (_id) => ['federated_learning', 'distributed_learning'],
            advertiseCapabilities: async (_caps) => { }
        },
        trustService: { verifyPeerTrust: async (_id) => true },
        messagingService: {
            sendMessage: async (_targetId, type, payload) => {
                // Simulate peer responding with weights immediately
                if (type === 'federated_round_start') {
                    const handler = messageHandlers.get('federated_round_weights');
                    if (handler)
                        handler({ roundId: payload.roundId, localWeights: { layer1: [0.1, 0.2], layer2: [0.3, 0.4] } }, _targetId);
                }
            },
            onMessage: (type, handler) => {
                messageHandlers.set(type, handler);
            }
        },
        eventService: {
            publishEvent: async (_name, _payload) => { },
            subscribe: (_name, _handler) => { }
        }
    };
}
const tmpDir = path.join(os.tmpdir(), `aegis-int-test-${Date.now()}`);
fs.mkdirSync(tmpDir, { recursive: true });
console.log('═══════════════════════════════════════════════════════');
console.log('TEST: Federated Learning Integration Test');
console.log('═══════════════════════════════════════════════════════');
await test('Full federated round with mock DI', async () => {
    const policies = new LearningPolicies();
    policies.roundTimeoutMs = 8000;
    policies.requireTrustVerification = false;
    const roundManager = new RoundManager();
    const aggManager = new AggregationManager();
    const cpManager = new LearningCheckpointManager(tmpDir);
    const verManager = new LearningVersionManager();
    const loraManager = new LoRAManager(tmpDir);
    const privManager = new PrivacyManager();
    const dis = buildMockDis();
    const mgr = new LearningManager(roundManager, aggManager, cpManager, verManager, loraManager, privManager, policies);
    mgr.initialize(dis, 'integration-test-node');
    const stratCtx = {
        localNodeId: 'integration-test-node',
        dis,
        aggregationManager: aggManager,
        loraManager,
        privacyManager: privManager,
        checkpointManager: cpManager,
        versionManager: verManager
    };
    const federated = new FederatedLearningStrategy();
    await federated.initialize(stratCtx);
    mgr.registerStrategy(federated);
    const round = await mgr.startRound('federated');
    assert(round !== null, 'Round returned');
    assert(round.roundNumber === 1, 'First round number');
    assert(mgr.getState() === 'IDLE', 'State returns to IDLE');
    assert(round.strategyName === 'federated', 'Strategy recorded on round');
    assert(mgr.getRoundHistory().length === 1, 'Round in history');
    const history = mgr.getRoundHistory();
    assert(history[0].status === 'COMPLETE', 'Round completed successfully');
    await mgr.shutdown();
});
await test('VersionManager records round and entity version', async () => {
    const verManager = new LearningVersionManager();
    const record = verManager.createVersion('model-123', 'model', null, 'a'.repeat(64));
    assert(record.version === 'v1.0.0', 'First version is v1.0.0');
    assert(record.entityType === 'model', 'Entity type is model');
    verManager.recordRound('round-abc', 1);
    const history = verManager.getRoundHistory();
    assert(history.length === 1, 'Round history has 1 entry');
    assert(history[0].roundId === 'round-abc', 'Correct round ID in history');
});
await test('AggregationManager audit trail is non-empty after aggregation', async () => {
    const aggManager = new AggregationManager();
    const weights = [
        { layer1: [0.1, 0.2], layer2: [0.3, 0.4] },
        { layer1: [0.2, 0.3], layer2: [0.4, 0.5] }
    ];
    const result = await aggManager.aggregateWeights('round-1', 1, weights, ['node-a', 'node-b']);
    assert(result.contributors.length === 2, 'Both contributors recorded');
    assert(typeof result.resultHash === 'string' && result.resultHash.length === 64, 'Result hash is SHA-256');
    assert(result.auditTrail.length > 0, 'Audit trail non-empty');
});
await test('Privacy manager blocks forbidden data categories', async () => {
    const priv = new PrivacyManager();
    assert(priv.canTransmit('lora_adapter') === 'ALLOWED', 'LoRA adapter allowed');
    assert(priv.canTransmit('model_update') === 'ALLOWED', 'Model update allowed');
    assert(priv.canTransmit('dataset') === 'DENIED', 'Dataset blocked');
    assert(priv.canTransmit('conversation_history') === 'DENIED', 'Conversation history blocked');
    assert(priv.canTransmit('memory') === 'DENIED', 'Memory blocked');
    assert(priv.canTransmit('raw_user_file') === 'DENIED', 'Raw user file blocked');
    assert(priv.canTransmit('knowledge_package', ['shareable']) === 'ALLOWED', 'Knowledge package with shareable tag allowed');
    assert(priv.canTransmit('knowledge_package', []) === 'DENIED', 'Knowledge package without shareable tag blocked');
});
console.log('\n═══════════════════════════════════════════════════════');
console.log(`Integration Tests: ${passed} passed, ${failed} failed.`);
console.log('═══════════════════════════════════════════════════════\n');
if (failed > 0)
    process.exit(1);
//# sourceMappingURL=FederatedLearningIntegrationTest.js.map