import assert from 'assert';
import net from 'net';
import { PeerRegistry } from '../../packages/aegis-runtime/src/networking/PeerRegistry.js';
import { NodeTcpTransportAdapter, MAX_TCP_FRAME_SIZE } from '../../packages/aegis-runtime/src/networking/NodeTcpTransportAdapter.js';
import { ConnectionManager } from '../../packages/aegis-runtime/src/networking/ConnectionManager.js';
import { NetworkConfigurationManager } from '../../packages/aegis-runtime/src/networking/NetworkConfigurationManager.js';
import { PeerConnectionState, AEGIS_NET_PROTOCOL_VERSION } from '@aegis/sdk';

async function runPeerNetworkingUnitTests() {
  console.log('\n============================================================');
  console.log('  AEGIS Peer Networking — Comprehensive Unit Test Suite');
  console.log('============================================================\n');

  // ------------------------------------------------------------------------
  // Test 1: Canonical Identity & Endpoint Validation in PeerRegistry
  // ------------------------------------------------------------------------
  console.log('[Test 1] Canonical Identity Validation in PeerRegistry');
  const registry = new PeerRegistry(false); // loopback disallowed in prod mode

  const invalidIdResult = registry.registerPeer({
    nodeId: 'invalid-id-without-schema',
    endpoints: [{ transport: 'tcp', host: '192.168.1.50', port: 19911 }],
    connectionState: PeerConnectionState.DISCOVERED
  });
  assert.strictEqual(invalidIdResult, false, 'Must reject nodeId without aegis:// schema');

  // Loopback rejection when allowLoopback is false
  const loopbackResult = registry.registerPeer({
    nodeId: 'aegis://11111111-1111-4111-a111-111111111111',
    endpoints: [{ transport: 'tcp', host: '127.0.0.1', port: 19911 }],
    connectionState: PeerConnectionState.DISCOVERED
  });
  assert.strictEqual(loopbackResult, false, 'Must reject 127.0.0.1 when allowLoopback is false');

  // 0.0.0.0 is always rejected even if allowLoopback is true
  registry.setAllowLoopback(true);
  const wildcardResult = registry.registerPeer({
    nodeId: 'aegis://11111111-1111-4111-a111-111111111111',
    endpoints: [{ transport: 'tcp', host: '0.0.0.0', port: 19911 }],
    connectionState: PeerConnectionState.DISCOVERED
  });
  assert.strictEqual(wildcardResult, false, 'Must reject 0.0.0.0 as reachable peer address');

  // Valid registration
  const validResult = registry.registerPeer({
    nodeId: 'aegis://11111111-1111-4111-a111-111111111111',
    endpoints: [
      { transport: 'tcp', host: '192.168.1.50', port: 19911, priority: 2 },
      { transport: 'tcp', host: '10.0.0.5', port: 19911, priority: 1 }
    ],
    connectionState: PeerConnectionState.DISCOVERED
  });
  assert.strictEqual(validResult, true, 'Must accept valid canonical nodeId and endpoints');

  // Endpoint resolution prioritizes lowest numeric priority value
  const resolved = registry.resolveEndpoint('aegis://11111111-1111-4111-a111-111111111111', ['tcp']);
  assert.ok(resolved !== undefined);
  assert.strictEqual(resolved.endpoint.host, '10.0.0.5', 'Must resolve priority 1 endpoint over priority 2');
  console.log('  ✔ PeerRegistry strictly validates identity and resolves endpoints by priority');

  // ------------------------------------------------------------------------
  // Test 2: Stale Peer Pruning
  // ------------------------------------------------------------------------
  console.log('\n[Test 2] Stale Peer Pruning in PeerRegistry');
  const staleId = 'aegis://22222222-2222-4222-a222-222222222222';
  registry.registerPeer({
    nodeId: staleId,
    endpoints: [{ transport: 'tcp', host: '192.168.1.60', port: 19911 }],
    connectionState: PeerConnectionState.DISCOVERED
  });
  const peer = registry.getPeer(staleId)!;
  peer.lastSeen = Date.now() - 70000; // 70 seconds ago

  const pruned = registry.pruneStalePeers(60000);
  assert.ok(pruned.includes(staleId), 'Stale peer must be pruned');
  assert.strictEqual(registry.getPeer(staleId), undefined, 'Pruned peer must no longer exist');
  console.log('  ✔ Pruned stale discovered peers exceeding TTL');

  // ------------------------------------------------------------------------
  // Test 3: TCP Framing & Chunk Reassembly
  // ------------------------------------------------------------------------
  console.log('\n[Test 3] TCP Framing, Chunk Reassembly & Multiple Messages in Single Chunk');
  const adapter = new NodeTcpTransportAdapter();
  const testPort = await adapter.listen(0, '127.0.0.1');

  const receivedFrames: string[] = [];
  adapter.onMessage((socket, payload) => {
    receivedFrames.push(payload);
  });

  const rawClient = net.connect(testPort, '127.0.0.1');
  await new Promise(r => rawClient.once('connect', r));

  // Send message split into two partial TCP packets
  const msg1 = JSON.stringify({ type: 'TEST_MSG_PARTIAL', data: 'hello' });
  const buf1 = Buffer.from(msg1, 'utf8');
  const lenBuf1 = Buffer.alloc(4);
  lenBuf1.writeUInt32BE(buf1.length, 0);
  const fullPacket1 = Buffer.concat([lenBuf1, buf1]);

  // Write first half, wait 50ms, then second half
  const half1 = fullPacket1.subarray(0, 8);
  const half2 = fullPacket1.subarray(8);
  rawClient.write(half1);
  await new Promise(r => setTimeout(r, 50));
  rawClient.write(half2);
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(receivedFrames.length, 1, 'Should assemble partial TCP chunks into 1 frame');
  assert.strictEqual(JSON.parse(receivedFrames[0]).type, 'TEST_MSG_PARTIAL');

  // Send two complete frames packed together in a single TCP write
  const msgA = JSON.stringify({ frame: 'A' });
  const bufA = Buffer.from(msgA, 'utf8');
  const lenA = Buffer.alloc(4);
  lenA.writeUInt32BE(bufA.length, 0);

  const msgB = JSON.stringify({ frame: 'B' });
  const bufB = Buffer.from(msgB, 'utf8');
  const lenB = Buffer.alloc(4);
  lenB.writeUInt32BE(bufB.length, 0);

  rawClient.write(Buffer.concat([lenA, bufA, lenB, bufB]));
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(receivedFrames.length, 3, 'Should parse multiple frames in a single chunk');
  assert.strictEqual(JSON.parse(receivedFrames[1]).frame, 'A');
  assert.strictEqual(JSON.parse(receivedFrames[2]).frame, 'B');
  console.log('  ✔ TCP framing handles partial reads and multi-frame chunks flawlessly');

  // ------------------------------------------------------------------------
  // Test 4: Oversized Frame Protection
  // ------------------------------------------------------------------------
  console.log('\n[Test 4] Oversized Frame Protection');
  let clientDisconnected = false;
  rawClient.once('close', () => { clientDisconnected = true; });

  // Send header indicating huge frame (32MB > 16MB limit)
  const hugeLen = Buffer.alloc(4);
  hugeLen.writeUInt32BE(32 * 1024 * 1024, 0);
  rawClient.write(hugeLen);

  await new Promise(r => setTimeout(r, 100));
  assert.strictEqual(clientDisconnected, true, 'Server must terminate socket on oversized frame');
  console.log('  ✔ Oversized frame rejected and socket closed safely');

  await adapter.stop();

  // ------------------------------------------------------------------------
  // Test 5: Handshake Validation & Self-Connection Rejection
  // ------------------------------------------------------------------------
  console.log('\n[Test 5] Handshake Validation & Self-Connection Rejection');
  const nodeA_Id = 'aegis://aaaa1111-1111-4111-a111-111111111111';
  const nodeB_Id = 'aegis://bbbb2222-2222-4222-b222-222222222222';

  const regA = new PeerRegistry(true);
  const cfgA = new NetworkConfigurationManager({ allowLoopback: true, handshakeTimeoutMs: 1000 });
  const transportA = new NodeTcpTransportAdapter();
  const portA = await transportA.listen(0, '127.0.0.1');

  const connMgrA = new ConnectionManager(nodeA_Id, 'Node A', regA, cfgA, [transportA]);

  // Test self-connection rejection: simulate client sending HELLO with nodeA_Id
  const selfClient = net.connect(portA, '127.0.0.1');
  await new Promise(r => selfClient.once('connect', r));

  let selfReply = '';
  selfClient.on('data', (chunk) => {
    if (chunk.length >= 4) {
      selfReply = chunk.subarray(4).toString('utf8');
    }
  });

  const selfHello = JSON.stringify({
    type: 'HELLO',
    nodeId: nodeA_Id, // Same as local
    protocolVersion: AEGIS_NET_PROTOCOL_VERSION
  });
  const selfBuf = Buffer.from(selfHello, 'utf8');
  const selfLen = Buffer.alloc(4);
  selfLen.writeUInt32BE(selfBuf.length, 0);
  selfClient.write(Buffer.concat([selfLen, selfBuf]));

  await new Promise(r => setTimeout(r, 100));
  assert.ok(selfReply.includes('HELLO_FAIL') && selfReply.includes('Self connection rejected'), 'Must reject self-connection');
  console.log('  ✔ Self-connection attempt safely rejected with HELLO_FAIL');

  // Test protocol version mismatch
  const badVerClient = net.connect(portA, '127.0.0.1');
  await new Promise(r => badVerClient.once('connect', r));

  let badVerReply = '';
  badVerClient.on('data', (chunk) => {
    if (chunk.length >= 4) badVerReply = chunk.subarray(4).toString('utf8');
  });

  const badVerHello = JSON.stringify({
    type: 'HELLO',
    nodeId: nodeB_Id,
    protocolVersion: '99.0.0' // Incompatible version
  });
  const badVerBuf = Buffer.from(badVerHello, 'utf8');
  const badVerLen = Buffer.alloc(4);
  badVerLen.writeUInt32BE(badVerBuf.length, 0);
  badVerClient.write(Buffer.concat([badVerLen, badVerBuf]));

  await new Promise(r => setTimeout(r, 100));
  assert.ok(badVerReply.includes('HELLO_FAIL') && badVerReply.includes('Protocol version mismatch'), 'Must reject protocol mismatch');
  console.log('  ✔ Protocol version mismatch rejected with HELLO_FAIL');

  // Test malformed frames (null, number, invalid JSON) do not crash process
  const malformedClient = net.connect(portA, '127.0.0.1');
  await new Promise(r => malformedClient.once('connect', r));

  for (const badData of ['null', '12345', 'not-json-at-all']) {
    const badBuf = Buffer.from(badData, 'utf8');
    const badLen = Buffer.alloc(4);
    badLen.writeUInt32BE(badBuf.length, 0);
    malformedClient.write(Buffer.concat([badLen, badBuf]));
  }
  await new Promise(r => setTimeout(r, 50));
  console.log('  ✔ Handled null, numeric, and malformed frames without process crash');

  malformedClient.destroy();
  badVerClient.destroy();
  selfClient.destroy();
  await connMgrA.stop();
  await transportA.stop();

  console.log('\n============================================================');
  console.log('  ✔ ALL PEER NETWORKING UNIT TESTS PASSED SUCCESSFULLY!');
  console.log('============================================================\n');
}

runPeerNetworkingUnitTests().catch((err) => {
  console.error('\n❌ Peer Networking Unit Test Suite Failed:', err);
  process.exit(1);
});
