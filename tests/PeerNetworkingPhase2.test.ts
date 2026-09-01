import fs from 'fs';
import path from 'path';
import assert from 'assert';
import os from 'os';
import { fileURLToPath } from 'url';
import { NodeManager } from '../packages/aegis-node/src/NodeManager/NodeManager.js';
import { DistributedIntelligenceEngine } from '../packages/aegis-distributed-intelligence/src/adapter/DistributedIntelligenceEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.AEGIS_ALLOW_LOOPBACK = 'true';

async function runPeerNetworkingPhase2Tests() {
  console.log('\n============================================================');
  console.log('  AEGIS Phase 2 Networking & Peer Communication Test Suite');
  console.log('============================================================\n');

  const baseTempDir = path.resolve(__dirname, '../temporary/peer-net-test-' + Date.now());
  const dirNodeA = path.join(baseTempDir, 'node_A');
  const dirNodeB = path.join(baseTempDir, 'node_B');

  fs.mkdirSync(dirNodeA, { recursive: true });
  fs.mkdirSync(dirNodeB, { recursive: true });

  try {
    // ------------------------------------------------------------------------
    // Test 1: Independent Startup & Identity Loading
    // ------------------------------------------------------------------------
    console.log('[Test 1] Independent Node Startup & Identity Loading');
    const mgrA = new NodeManager(dirNodeA);
    mgrA.initialize('AEGIS Node Alpha');
    const idA = mgrA.getIdentity()!.nodeId;

    const mgrB = new NodeManager(dirNodeB);
    mgrB.initialize('AEGIS Node Beta');
    const idB = mgrB.getIdentity()!.nodeId;

    assert.ok(idA.startsWith('aegis://'), `Node A nodeId must start with aegis:// (got ${idA})`);
    assert.ok(idB.startsWith('aegis://'), `Node B nodeId must start with aegis:// (got ${idB})`);
    assert.notStrictEqual(idA, idB, 'Node A and Node B MUST have distinct canonical nodeIds');
    console.log(`  ✔ Node A canonical nodeId: ${idA}`);
    console.log(`  ✔ Node B canonical nodeId: ${idB}`);

    // ------------------------------------------------------------------------
    // Test 2: Engine Initialization & Network Listening
    // ------------------------------------------------------------------------
    console.log('\n[Test 2] Engine Initialization & Network Listening');
    const contextA: any = {
      nodeId: idA,
      runtimeId: 'runtime-A',
      platform: os.platform(),
      architecture: os.arch(),
      bootMode: 'NORMAL',
      getNodeIdentity: () => mgrA.getIdentity()!,
      getWorkspacePath: () => dirNodeA,
      getLogger: () => ({ info: () => {}, warn: () => {}, error: () => {} }),
      getConfig: () => ({}),
      getSecrets: () => ({}),
      getService: () => undefined,
      getEventBus: () => ({ on: () => {}, off: () => {}, emit: () => {} })
    };

    const contextB: any = {
      nodeId: idB,
      runtimeId: 'runtime-B',
      platform: os.platform(),
      architecture: os.arch(),
      bootMode: 'NORMAL',
      getNodeIdentity: () => mgrB.getIdentity()!,
      getWorkspacePath: () => dirNodeB,
      getLogger: () => ({ info: () => {}, warn: () => {}, error: () => {} }),
      getConfig: () => ({}),
      getSecrets: () => ({}),
      getService: () => undefined,
      getEventBus: () => ({ on: () => {}, off: () => {}, emit: () => {} })
    };

    const engineA = new DistributedIntelligenceEngine();
    engineA.port = 19910; // msgPort will be 19911
    await engineA.initialize(contextA);

    const engineB = new DistributedIntelligenceEngine();
    engineB.port = 19920; // msgPort will be 19921
    await engineB.initialize(contextB);

    assert.ok(engineA.peerRegistry !== undefined, 'Engine A must instantiate PeerRegistry');
    assert.ok(engineB.peerRegistry !== undefined, 'Engine B must instantiate PeerRegistry');
    console.log('  ✔ Engine A and Engine B initialized networking cores cleanly');

    // ------------------------------------------------------------------------
    // Test 3 & 4: Peer Discovery & Peer Registry Resolution
    // ------------------------------------------------------------------------
    console.log('\n[Test 3 & 4] Peer Discovery & Peer Registry Resolution');
    // Register Node B in Node A's discovery service (msgPort = 19921)
    await engineA.discoveryService.registerNode(idB, '127.0.0.1', 19921);
    // Register Node A in Node B's discovery service (msgPort = 19911)
    await engineB.discoveryService.registerNode(idA, '127.0.0.1', 19911);

    const peerB = engineA.peerRegistry.getPeer(idB);
    assert.ok(peerB !== undefined, 'Peer B must exist in Node A PeerRegistry');
    assert.strictEqual(peerB.nodeId, idB, 'Registry primary key must be canonical nodeId');
    
    const resolvedB = engineA.peerRegistry.resolveEndpoint(idB, ['tcp']);
    assert.ok(resolvedB !== undefined, 'Node A must resolve reachable endpoint for Node B');
    assert.strictEqual(resolvedB.endpoint.host, '127.0.0.1');
    assert.strictEqual(resolvedB.endpoint.port, 19921);
    console.log(`  ✔ Node A resolved Node B endpoint: ${resolvedB.endpoint.host}:${resolvedB.endpoint.port}`);

    // ------------------------------------------------------------------------
    // Test 5 & 6: Connection & Mutual Identity Handshake
    // ------------------------------------------------------------------------
    console.log('\n[Test 5 & 6] Connection Establishment & Mutual Identity Handshake');
    const connA = await engineA.connectionManager.connectToPeer(idB);
    assert.ok(connA !== undefined, 'ConnectionManager must return ActivePeerConnection');
    assert.strictEqual(connA.nodeId, idB, 'Connection must map to target nodeId');

    // Give handshake a moment to finish verification
    await new Promise(r => setTimeout(r, 500));

    const activeA = engineA.peerRegistry.getPeer(idB);
    assert.ok(activeA !== undefined);
    assert.strictEqual(activeA.connectionState, 'ACTIVE', 'Node A connection state to Node B must be ACTIVE');
    console.log(`  ✔ Mutual HELLO / HELLO_ACK identity handshake succeeded for ${idB}`);

    // ------------------------------------------------------------------------
    // Test 7 & 8: Bidirectional Messaging (A -> B and B -> A)
    // ------------------------------------------------------------------------
    console.log('\n[Test 7 & 8] Bidirectional P2P Messaging (A -> B and B -> A)');
    let msgReceivedAtB: any = null;
    let senderReceivedAtB = '';

    engineB.messagingService.onMessage('test_ping', (payload, senderId) => {
      msgReceivedAtB = payload;
      senderReceivedAtB = senderId;
    });

    let msgReceivedAtA: any = null;
    let senderReceivedAtA = '';

    engineA.messagingService.onMessage('test_pong', (payload, senderId) => {
      msgReceivedAtA = payload;
      senderReceivedAtA = senderId;
    });

    // Send A -> B
    await engineA.messagingService.sendMessage(idB, 'test_ping', { text: 'Hello from Node A' });
    await new Promise(r => setTimeout(r, 500));

    assert.ok(msgReceivedAtB !== null, 'Node B must receive message from Node A');
    assert.strictEqual(msgReceivedAtB.text, 'Hello from Node A');
    assert.strictEqual(senderReceivedAtB, idA, `Sender ID must be Node A's canonical nodeId (${idA})`);
    console.log(`  ✔ Message A -> B delivered successfully (Sender: ${senderReceivedAtB})`);

    // Send B -> A
    await engineB.messagingService.sendMessage(idA, 'test_pong', { text: 'Reply from Node B' });
    await new Promise(r => setTimeout(r, 500));

    assert.ok(msgReceivedAtA !== null, 'Node A must receive reply from Node B');
    assert.strictEqual(msgReceivedAtA.text, 'Reply from Node B');
    assert.strictEqual(senderReceivedAtA, idB, `Sender ID must be Node B's canonical nodeId (${idB})`);
    console.log(`  ✔ Message B -> A delivered successfully (Sender: ${senderReceivedAtA})`);

    // ------------------------------------------------------------------------
    // Test 9 & 10: Disconnect Detection & Automatic Reconnection
    // ------------------------------------------------------------------------
    console.log('\n[Test 9 & 10] Disconnect Detection & Automatic Reconnection');
    await engineB.shutdown();
    await new Promise(r => setTimeout(r, 600));

    const disconnectedPeerB = engineA.peerRegistry.getPeer(idB);
    assert.ok(disconnectedPeerB !== undefined);
    assert.strictEqual(disconnectedPeerB.connectionState, 'DISCONNECTED', 'Node A must detect Node B disconnect');
    console.log('  ✔ Node A detected Node B disconnect and updated state to DISCONNECTED');

    // Restart Node B
    console.log('  Restarting Node B...');
    const engineB_rebound = new DistributedIntelligenceEngine();
    engineB_rebound.port = 19920;
    await engineB_rebound.initialize(contextB);

    // Wait for backoff reconnect timer on Node A to reconnect
    console.log('  Waiting for Node A exponential backoff reconnection...');
    await new Promise(r => setTimeout(r, 2000));

    const reconnectedPeerB = engineA.peerRegistry.getPeer(idB);
    assert.ok(reconnectedPeerB !== undefined);
    assert.strictEqual(reconnectedPeerB.connectionState, 'ACTIVE', 'Reconnected peer state must be ACTIVE');
    console.log(`  ✔ Node A automatically re-established connection (State: ${reconnectedPeerB.connectionState})`);

    await engineA.shutdown();
    await engineB_rebound.shutdown();

    console.log('\n============================================================');
    console.log('  ✔ ALL PHASE 2 PEER NETWORKING TESTS PASSED SUCCESSFULLY!');
    console.log('============================================================\n');
  } finally {
    try {
      fs.rmSync(baseTempDir, { recursive: true, force: true });
    } catch {}
  }
}

runPeerNetworkingPhase2Tests().catch((err) => {
  console.error('\n❌ Peer Networking Phase 2 Test Suite Failed:', err);
  process.exit(1);
});
