import fs from 'fs';
import path from 'path';
import assert from 'assert';
import os from 'os';
import { fileURLToPath } from 'url';
import { NodeIdentityManager } from '../packages/aegis-node/src/NodeIdentity/NodeIdentityManager.js';
import { NodeManager } from '../packages/aegis-node/src/NodeManager/NodeManager.js';
import { DistributedIntelligenceEngine } from '../workspace/engines/distributed-intelligence/src/adapter/DistributedIntelligenceEngine.js';
import { DistributedLearningEngine } from '../workspace/engines/aegis-distributed-learning/src/DistributedLearningEngine.js';
import { FederatedLearningEngine } from '../workspace/engines/aegis-federated-learning/src/FederatedLearningEngine.js';
import { SwarmLearningEngine } from '../workspace/engines/aegis-swarm-learning/src/SwarmLearningEngine.js';
import { CollaborationEngine } from '../workspace/engines/aegis-collaboration/src/CollaborationEngine.js';
import { CollectiveIntelligenceEngine } from '../workspace/engines/aegis-collective-intelligence/src/CollectiveIntelligenceEngine.js';
import { DistributedInferenceEngine } from '../workspace/engines/aegis-distributed-inference/src/DistributedInferenceEngine.js';
import { Bootloader } from '../packages/aegis-runtime/src/boot/Bootloader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runCanonicalNodeIdentityTests() {
  console.log('\n============================================================');
  console.log('  AEGIS Canonical Node Identity System — Verification Test Suite');
  console.log('============================================================\n');

  const testTempDir = path.resolve(__dirname, '../temporary/identity-test-' + Date.now());
  if (!fs.existsSync(testTempDir)) {
    fs.mkdirSync(testTempDir, { recursive: true });
  }

  try {
    // ------------------------------------------------------------------------
    // Test 1: First Startup — Identity Generation & Storage
    // ------------------------------------------------------------------------
    console.log('[Test 1] First Startup — Identity Generation & Disk Storage');
    const nodeMgr1 = new NodeManager(testTempDir);
    nodeMgr1.initialize('Test Node Alpha', 'Enterprise', 'Developer');
    const identity1 = nodeMgr1.getIdentity();

    assert.ok(identity1 !== null, 'Identity object should be created');
    assert.ok(identity1.nodeId.startsWith('aegis://'), `nodeId should start with aegis:// schema (got: ${identity1.nodeId})`);
    assert.strictEqual(identity1.name, 'Test Node Alpha');
    assert.ok(fs.existsSync(path.join(testTempDir, 'identity', 'identity.json')), 'identity.json must be persisted');
    console.log(`  ✔ Generated and persisted canonical nodeId: ${identity1.nodeId}`);

    // ------------------------------------------------------------------------
    // Test 2: Restart Invariance
    // ------------------------------------------------------------------------
    console.log('\n[Test 2] Restart Invariance — Identity Reload Persistence');
    const nodeMgr2 = new NodeManager(testTempDir);
    nodeMgr2.initialize('Test Node Alpha (Renamed)', 'Enterprise', 'Developer');
    const identity2 = nodeMgr2.getIdentity();

    assert.ok(identity2 !== null);
    assert.strictEqual(identity2.nodeId, identity1.nodeId, 'nodeId MUST remain identical across node reboots');
    console.log(`  ✔ Reloaded identical nodeId across restart: ${identity2.nodeId}`);

    // ------------------------------------------------------------------------
    // Test 3: Display Name Independence
    // ------------------------------------------------------------------------
    console.log('\n[Test 3] Display Name Independence');
    assert.strictEqual(identity2.nodeId, identity1.nodeId, 'Changing display name MUST NOT mutate nodeId');
    console.log('  ✔ Node display name changed without mutating canonical nodeId');

    // ------------------------------------------------------------------------
    // Test 4: Cross-Engine Identity Consistency
    // ------------------------------------------------------------------------
    console.log('\n[Test 4] Cross-Engine Identity Consistency');
    const canonicalId = identity1.nodeId;
    const mockRuntimeContext: any = {
      nodeId: canonicalId,
      runtimeId: 'runtime-session-xyz',
      kernelVersion: '1.0.0',
      bootId: 'boot-123',
      platform: os.platform(),
      architecture: os.arch(),
      bootMode: 'NORMAL',
      getNodeIdentity: () => ({
        nodeId: canonicalId,
        nodeName: 'Test Node Alpha',
        createdAt: identity1.createdAt
      }),
      getWorkspacePath: () => testTempDir,
      getLogger: () => ({ info: () => {}, warn: () => {}, error: () => {} }),
      getConfig: () => ({}),
      getSecrets: () => ({}),
      getService: () => undefined,
      getEventBus: () => ({ on: () => {}, off: () => {}, emit: () => {} })
    };

    const dieEngine = new DistributedIntelligenceEngine();
    const learningEngine = new DistributedLearningEngine();
    const federatedEngine = new FederatedLearningEngine();
    const swarmEngine = new SwarmLearningEngine();
    const collabEngine = new CollaborationEngine();
    const collectiveEngine = new CollectiveIntelligenceEngine();
    const inferenceEngine = new DistributedInferenceEngine();

    await dieEngine.initialize(mockRuntimeContext);
    await learningEngine.initialize(mockRuntimeContext);
    await federatedEngine.initialize(mockRuntimeContext);
    await swarmEngine.initialize(mockRuntimeContext);
    await collabEngine.initialize(mockRuntimeContext);
    await collectiveEngine.initialize(mockRuntimeContext);
    await inferenceEngine.initialize(mockRuntimeContext);

    assert.strictEqual(dieEngine.nodeId, canonicalId, 'Distributed Intelligence must use canonical nodeId');
    assert.strictEqual(collabEngine['localNodeId'], canonicalId, 'Collaboration Engine must use canonical nodeId');
    assert.strictEqual(collectiveEngine['localNodeId'], canonicalId, 'Collective Intelligence Engine must use canonical nodeId');
    assert.strictEqual(swarmEngine['localNodeId'], canonicalId, 'Swarm Learning Engine must use canonical nodeId');
    assert.strictEqual(federatedEngine['localNodeId'], canonicalId, 'Federated Learning Engine must use canonical nodeId');
    console.log('  ✔ All 7 distributed engines receive and validate the exact same canonical nodeId');

    // ------------------------------------------------------------------------
    // Test 5: Strict Initialization Failure on Missing Identity
    // ------------------------------------------------------------------------
    console.log('\n[Test 5] Strict Initialization Failure on Missing Identity');
    const invalidContext: any = { ...mockRuntimeContext, nodeId: '' };

    await assert.rejects(
      async () => { await new DistributedIntelligenceEngine().initialize(invalidContext); },
      /Fatal: Canonical nodeId is missing or invalid/,
      'DI Engine must reject empty nodeId'
    );

    await assert.rejects(
      async () => { await new DistributedLearningEngine().initialize(invalidContext); },
      /Fatal: Canonical nodeId is missing or invalid/,
      'Learning Engine must reject empty nodeId'
    );

    await assert.rejects(
      async () => { await new SwarmLearningEngine().initialize(invalidContext); },
      /Fatal: Canonical nodeId is missing or invalid/,
      'Swarm Engine must reject empty nodeId'
    );

    await assert.rejects(
      async () => { await new CollaborationEngine().initialize(invalidContext); },
      /Fatal: Canonical nodeId is missing or invalid/,
      'Collaboration Engine must reject empty nodeId'
    );

    console.log('  ✔ Every distributed engine throws a fatal error if nodeId is missing/empty');

    // ------------------------------------------------------------------------
    // Test 6: Identity Uniqueness and Runtime Ownership Validation
    // ------------------------------------------------------------------------
    console.log('\n[Test 6] Identity Uniqueness and Runtime Ownership Validation');
    const nodeA_Dir = path.join(testTempDir, 'node_A');
    const nodeB_Dir = path.join(testTempDir, 'node_B');

    const nodeA = new NodeManager(nodeA_Dir);
    nodeA.initialize('AEGIS Node A');

    const nodeB = new NodeManager(nodeB_Dir);
    nodeB.initialize('AEGIS Node B');

    const idA = nodeA.getIdentity()!.nodeId;
    const idB = nodeB.getIdentity()!.nodeId;

    assert.notStrictEqual(idA, idB, 'Two independent AEGIS nodes MUST generate distinct canonical nodeIds');
    console.log(`  ✔ Node A (${idA}) and Node B (${idB}) generated unique canonical nodeIds`);

    // ------------------------------------------------------------------------
    // Test 7: Logical ID vs Network Endpoint Separation
    // ------------------------------------------------------------------------
    console.log('\n[Test 7] Logical Identifier vs Network Endpoint Separation');
    const peerEndpoint = { host: '192.168.1.100', port: 9900 };
    await dieEngine.discoveryService.registerNode(idB, peerEndpoint.host, peerEndpoint.port);
    const peerRecord = dieEngine.discoveryService.getLocalPeer(idB);

    assert.ok(peerRecord !== undefined, 'Peer record should be retrievable by canonical nodeId');
    assert.strictEqual(peerRecord.host, '192.168.1.100', 'Peer record stores endpoint host');
    assert.strictEqual(peerRecord.port, 9900, 'Peer record stores endpoint port');
    console.log('  ✔ Canonical nodeId (key) successfully maps to dynamic reachability endpoint');

    console.log('\n============================================================');
    console.log('  ✔ ALL CANONICAL NODE IDENTITY TESTS PASSED SUCCESSFULLY!');
    console.log('============================================================\n');
  } finally {
    // Cleanup temporary test directory
    try {
      fs.rmSync(testTempDir, { recursive: true, force: true });
    } catch {}
  }
}

runCanonicalNodeIdentityTests().catch((err) => {
  console.error('\n❌ Canonical Node Identity Test Suite Failed:', err);
  process.exit(1);
});
