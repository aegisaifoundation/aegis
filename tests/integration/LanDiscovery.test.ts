import assert from 'assert';
import { LanDiscoveryProvider } from '../../packages/aegis-runtime/src/networking/LanDiscoveryProvider.js';
import { PeerRegistry } from '../../packages/aegis-runtime/src/networking/PeerRegistry.js';
import { IPeerDescriptor, PeerConnectionState } from '@aegis/sdk';

async function runLanDiscoveryTests() {
  console.log('\n============================================================');
  console.log('  AEGIS Phase 7 — LAN Discovery & Announcement Test Suite');
  console.log('============================================================\n');

  const testUdpPort = 9889; // Use non-default test port to isolate
  const idA = 'aegis://11111111-aaaa-4111-a111-111111111111';
  const idB = 'aegis://22222222-bbbb-4222-b222-222222222222';

  const registryA = new PeerRegistry(true);
  const registryB = new PeerRegistry(true);

  let providerA: LanDiscoveryProvider | null = null;
  let providerB: LanDiscoveryProvider | null = null;

  try {
    // ------------------------------------------------------------------------
    // Test 1: Start Discovery Providers on Node A and Node B
    // ------------------------------------------------------------------------
    console.log('[Test 1] Provider Binding & Announcement Broadcast');
    providerA = new LanDiscoveryProvider(
      idA,
      'Node-Alpha',
      () => [{ transport: 'tcp', port: 19911, priority: 1 }],
      testUdpPort
    );

    providerB = new LanDiscoveryProvider(
      idB,
      'Node-Beta',
      () => [{ transport: 'tcp', port: 19921, priority: 1 }],
      testUdpPort
    );

    const discoveredAtA: IPeerDescriptor[] = [];
    const discoveredAtB: IPeerDescriptor[] = [];

    providerA.onPeerDiscovered((peer) => {
      discoveredAtA.push(peer);
      registryA.registerPeer(peer);
    });

    providerB.onPeerDiscovered((peer) => {
      discoveredAtB.push(peer);
      registryB.registerPeer(peer);
    });

    await providerA.start();
    await providerB.start();

    console.log('  ✔ Both LAN discovery providers bound to UDP port ' + testUdpPort);

    // ------------------------------------------------------------------------
    // Test 2: Validation of Received Peer Announcements
    // ------------------------------------------------------------------------
    console.log('\n[Test 2] Mutual Announcement Reception & Parsing');
    // Wait for announcements
    const deadline = Date.now() + 4000;
    while (Date.now() < deadline && (discoveredAtA.length === 0 || discoveredAtB.length === 0)) {
      await new Promise(r => setTimeout(r, 200));
    }

    // Node A should discover Node B
    const peerB = registryA.getPeer(idB);
    assert.ok(peerB !== undefined, 'Node A must discover Node B via LAN announcements');
    assert.strictEqual(peerB.nodeId, idB);
    assert.strictEqual(peerB.endpoints.length, 1);
    assert.strictEqual(peerB.endpoints[0].port, 19921);
    console.log(`  ✔ Node A discovered Node B (${peerB.nodeId} @ ${peerB.endpoints[0].host}:${peerB.endpoints[0].port})`);

    // Node B should discover Node A
    const peerA = registryB.getPeer(idA);
    assert.ok(peerA !== undefined, 'Node B must discover Node A via LAN announcements');
    assert.strictEqual(peerA.nodeId, idA);
    assert.strictEqual(peerA.endpoints.length, 1);
    assert.strictEqual(peerA.endpoints[0].port, 19911);
    console.log(`  ✔ Node B discovered Node A (${peerA.nodeId} @ ${peerA.endpoints[0].host}:${peerA.endpoints[0].port})`);

    // ------------------------------------------------------------------------
    // Test 3: Duplicate Announcements Do Not Corrupt Peer Registry
    // ------------------------------------------------------------------------
    console.log('\n[Test 3] Duplicate Announcement Suppression & Metadata Preservation');
    const initialPeerCountA = registryA.listPeers().length;
    // Simulate multiple duplicate announcements
    registryA.registerPeer(peerB);
    registryA.registerPeer(peerB);
    assert.strictEqual(registryA.listPeers().length, initialPeerCountA, 'Duplicate announcements must not create duplicate peers');
    console.log('  ✔ Multiple repeated announcements updated metadata without creating duplicate records');

    // ------------------------------------------------------------------------
    // Test 4: Stale Peer Expiration
    // ------------------------------------------------------------------------
    console.log('\n[Test 4] Stale Peer Expiration');
    const fakePeerId = 'aegis://99999999-9999-4999-9999-999999999999';
    registryA.registerPeer({
      nodeId: fakePeerId,
      endpoints: [{ transport: 'tcp', host: '192.168.1.99', port: 9999 }],
      connectionState: PeerConnectionState.DISCOVERED
    });
    registryA.getPeer(fakePeerId)!.lastSeen = Date.now() - 65000;

    const pruned = registryA.pruneStalePeers(60000);
    assert.ok(pruned.includes(fakePeerId), 'Must prune inactive fake peer');
    assert.strictEqual(registryA.getPeer(fakePeerId), undefined);
    console.log('  ✔ Stale inactive peer expired and cleaned up from registry');

    // ------------------------------------------------------------------------
    // Test 5: Manual Registration Independence
    // ------------------------------------------------------------------------
    console.log('\n[Test 5] Manual Registration Independence from UDP Discovery');
    const manualPeerId = 'aegis://77777777-7777-4777-7777-777777777777';
    registryA.registerPeer({
      nodeId: manualPeerId,
      endpoints: [{ transport: 'tcp', host: '10.50.0.1', port: 19900, priority: 1 }],
      connectionState: PeerConnectionState.DISCOVERED
    });
    const resolvedManual = registryA.resolveEndpoint(manualPeerId, ['tcp']);
    assert.ok(resolvedManual !== undefined);
    assert.strictEqual(resolvedManual.endpoint.host, '10.50.0.1');
    console.log('  ✔ Manual registration functions independently of UDP broadcast discovery');

    console.log('\n============================================================');
    console.log('  ✔ ALL LAN DISCOVERY TESTS PASSED SUCCESSFULLY!');
    console.log('============================================================\n');
  } finally {
    if (providerA) await providerA.stop();
    if (providerB) await providerB.stop();
  }
}

runLanDiscoveryTests().catch((err) => {
  console.error('\n❌ LAN Discovery Test Suite Failed:', err);
  process.exit(1);
});
