import path from 'path';
import fs from 'fs';
import os from 'os';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { NodeManager } from '../../packages/aegis-node/src/NodeManager/NodeManager.js';
import { DistributedIntelligenceEngine } from '../../packages/aegis-distributed-intelligence/src/adapter/DistributedIntelligenceEngine.js';
import { NodeTcpTransportAdapter } from '../../packages/aegis-runtime/src/networking/NodeTcpTransportAdapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.AEGIS_ALLOW_LOOPBACK = 'true';

async function runNetworkingFailureRecoveryTests() {
  console.log('\n============================================================');
  console.log('  AEGIS Networking Failure & Recovery Verification Tests');
  console.log('============================================================\n');

  const baseTemp = path.resolve(__dirname, '../../temporary/recovery-test-' + Date.now());
  const dirA = path.join(baseTemp, 'node_A');
  const dirB = path.join(baseTemp, 'node_B');

  fs.mkdirSync(dirA, { recursive: true });
  fs.mkdirSync(dirB, { recursive: true });

  const mgrA = new NodeManager(dirA);
  mgrA.initialize('Recovery Node Alpha');
  const idA = mgrA.getIdentity()!.nodeId;

  const mgrB = new NodeManager(dirB);
  mgrB.initialize('Recovery Node Beta');
  const idB = mgrB.getIdentity()!.nodeId;

  const contextA: any = {
    nodeId: idA,
    runtimeId: 'recovery-runtime-A',
    platform: os.platform(),
    architecture: os.arch(),
    bootMode: 'NORMAL',
    getNodeIdentity: () => mgrA.getIdentity()!,
    getWorkspacePath: () => dirA,
    getLogger: () => ({ info: () => {}, warn: () => {}, error: () => {} }),
    getConfig: () => ({ port: 21110 }),
    getSecrets: () => ({}),
    getService: () => undefined,
    getEventBus: () => ({ on: () => {}, off: () => {}, emit: () => {} })
  };

  const contextB: any = {
    nodeId: idB,
    runtimeId: 'recovery-runtime-B',
    platform: os.platform(),
    architecture: os.arch(),
    bootMode: 'NORMAL',
    getNodeIdentity: () => mgrB.getIdentity()!,
    getWorkspacePath: () => dirB,
    getLogger: () => ({ info: () => {}, warn: () => {}, error: () => {} }),
    getConfig: () => ({ port: 21120 }),
    getSecrets: () => ({}),
    getService: () => undefined,
    getEventBus: () => ({ on: () => {}, off: () => {}, emit: () => {} })
  };

  let engineA: DistributedIntelligenceEngine | null = null;
  let engineB: DistributedIntelligenceEngine | null = null;

  try {
    // ------------------------------------------------------------------------
    // Scenario 1: Peer Offline at Startup -> Scheduled Reconnection
    // ------------------------------------------------------------------------
    console.log('[Scenario 1] Peer Offline at Startup & Deferred Connection Recovery');
    engineA = new DistributedIntelligenceEngine();
    engineA.port = 21110;
    await engineA.initialize(contextA);

    // Register Node B while Node B is offline
    await engineA.discoveryService.registerNode(idB, '127.0.0.1', 21121);

    // Attempt connecting to offline Node B
    console.log('  Attempting connection to offline Node B...');
    let threw = false;
    try {
      await engineA.connectionManager.connectToPeer(idB);
    } catch (err: any) {
      threw = true;
      console.log(`  ✔ Expected failure caught when peer offline: ${err.message}`);
    }
    assert.strictEqual(threw, true, 'Connecting to offline peer must fail cleanly without crashing');

    // Confirm state is DISCONNECTED and reconnection scheduled
    const peerBState = engineA.peerRegistry.getPeer(idB);
    assert.strictEqual(peerBState?.connectionState, 'DISCONNECTED');
    console.log('  ✔ Node A scheduled backoff reconnection for offline peer');

    // ------------------------------------------------------------------------
    // Scenario 2: Peer Becomes Available Later -> Automatic Recovery
    // ------------------------------------------------------------------------
    console.log('\n[Scenario 2] Peer Starts Later -> Automatic Reconnection to ACTIVE');
    console.log('  Now starting Node B...');
    engineB = new DistributedIntelligenceEngine();
    engineB.port = 21120;
    await engineB.initialize(contextB);
    await engineB.discoveryService.registerNode(idA, '127.0.0.1', 21111);

    // Give Node A's reconnect backoff timer time to trigger
    console.log('  Waiting for Node A reconnect backoff timer...');
    let connected = false;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 400));
      const p = engineA.peerRegistry.getPeer(idB);
      if (p?.connectionState === 'ACTIVE') {
        connected = true;
        break;
      }
    }

    assert.ok(connected, 'Node A must automatically connect to Node B once Node B is online');
    console.log('  ✔ Node A automatically connected to Node B after deferred startup (State: ACTIVE)');

    // ------------------------------------------------------------------------
    // Scenario 3: Verify Message Delivery after Recovery
    // ------------------------------------------------------------------------
    console.log('\n[Scenario 3] Bidirectional Messaging after Recovery');
    let msgReceivedAtB: any = null;
    let senderAtB = '';

    engineB.messagingService.onMessage('recovery_ping', (payload, senderId) => {
      msgReceivedAtB = payload;
      senderAtB = senderId;
    });

    await engineA.messagingService.sendMessage(idB, 'recovery_ping', { msg: 'Recovered connection message' });
    await new Promise(r => setTimeout(r, 400));

    assert.ok(msgReceivedAtB !== null, 'Node B must receive message on recovered connection');
    assert.strictEqual(msgReceivedAtB.msg, 'Recovered connection message');
    assert.strictEqual(senderAtB, idA);
    console.log('  ✔ Verified application payload delivery over recovered connection');

    // ------------------------------------------------------------------------
    // Scenario 4: Port Conflict Handling (Strict vs Dynamic)
    // ------------------------------------------------------------------------
    console.log('\n[Scenario 4] Port Conflict Handling');
    const conflictingAdapter = new NodeTcpTransportAdapter();
    // Port 21111 is currently occupied on 0.0.0.0 by engineA
    const boundPort = await conflictingAdapter.listen(21111, '0.0.0.0', false);
    assert.notStrictEqual(boundPort, 21111, 'Adapter must bind to alternative dynamic port when occupied');
    assert.ok(boundPort > 0, `Bound dynamic port must be valid (> 0, got ${boundPort})`);
    console.log(`  ✔ Handled port conflict with safe fallback to dynamic port ${boundPort}`);
    await conflictingAdapter.stop();

    // Strict port mode should throw on occupied port
    let strictThrew = false;
    const strictAdapter = new NodeTcpTransportAdapter();
    try {
      await strictAdapter.listen(21111, '0.0.0.0', true); // strictPort = true
    } catch (err: any) {
      strictThrew = true;
      console.log(`  ✔ Strict port mode rejected occupied port as expected: ${err.message}`);
    }
    assert.strictEqual(strictThrew, true, 'Strict port mode must fail when requested port occupied');
    await strictAdapter.stop();

    console.log('\n============================================================');
    console.log('  ✔ ALL NETWORKING FAILURE & RECOVERY TESTS PASSED!');
    console.log('============================================================\n');
  } finally {
    if (engineA) await engineA.shutdown();
    if (engineB) await engineB.shutdown();
    try {
      fs.rmSync(baseTemp, { recursive: true, force: true });
    } catch {}
  }
}

runNetworkingFailureRecoveryTests().catch((err) => {
  console.error('\n❌ Failure Recovery Test Suite Failed:', err);
  process.exit(1);
});
