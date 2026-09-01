import path from 'path';
import os from 'os';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { NodeManager } from '../packages/aegis-node/src/NodeManager/NodeManager.js';
import { DistributedIntelligenceEngine, getLocalIpAddress } from '../packages/aegis-distributed-intelligence/src/adapter/DistributedIntelligenceEngine.js';
import { SeedPeerDiscoveryProvider } from '../packages/aegis-runtime/src/networking/SeedPeerDiscoveryProvider.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runRealTwoComputerVerification() {
  const args = process.argv.slice(2);
  let nodeName = 'AEGIS Physical Node';
  let port = 9900;
  let seedHost = '';
  let seedPort = 0;
  let targetId = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--node-name' && args[i + 1]) nodeName = args[++i];
    else if (args[i] === '--port' && args[i + 1]) port = parseInt(args[++i], 10);
    else if (args[i] === '--seed-host' && args[i + 1]) seedHost = args[++i];
    else if (args[i] === '--seed-port' && args[i + 1]) seedPort = parseInt(args[++i], 10);
    else if (args[i] === '--target-id' && args[i + 1]) targetId = args[++i];
  }

  console.log('================================================================');
  console.log('  AEGIS Phase 2 Real Two-Computer Verification Tool');
  console.log('================================================================');

  const nodeDir = path.resolve(os.homedir(), '.aegis', `node-${port}`);
  const mgr = new NodeManager(nodeDir);
  mgr.initialize(nodeName);

  const identity = mgr.getIdentity()!;
  const localIp = getLocalIpAddress();

  console.log(`\nLocal Computer Information:`);
  console.log(`  • Canonical Node ID: ${identity.nodeId}`);
  console.log(`  • Display Name:     ${identity.nodeName}`);
  console.log(`  • LAN IP Address:   ${localIp}`);
  console.log(`  • DIE TCP Port:     ${port}`);
  console.log(`  • Message TCP Port: ${port + 1}`);
  console.log(`  • Discovery Port:   9888 (UDP)\n`);

  const context: any = {
    nodeId: identity.nodeId,
    runtimeId: `runtime-${port}`,
    platform: os.platform(),
    architecture: os.arch(),
    bootMode: 'NORMAL',
    getNodeIdentity: () => identity,
    getWorkspacePath: () => nodeDir,
    getLogger: () => ({ info: console.log, warn: console.warn, error: console.error }),
    getConfig: () => ({}),
    getSecrets: () => ({}),
    getService: () => undefined,
    getEventBus: () => ({ on: () => {}, off: () => {}, emit: () => {} })
  };

  const engine = new DistributedIntelligenceEngine();
  engine.port = port;
  engine.nodeName = nodeName;

  await engine.initialize(context);

  if (seedHost && seedPort) {
    console.log(`[Seed Peer] Adding static seed peer at ${seedHost}:${seedPort}`);
    const seedProvider = new SeedPeerDiscoveryProvider([
      { nodeId: targetId || undefined, host: seedHost, port: seedPort, transport: 'tcp' }
    ]);
    seedProvider.onPeerDiscovered((peer) => engine.peerRegistry.registerPeer(peer));
    await seedProvider.start();
  }

  // Set up message listener
  engine.messagingService.onMessage('cli_chat', (payload, senderId) => {
    console.log(`\n📩 [MESSAGE RECEIVED] From: ${senderId}`);
    console.log(`   Message: ${payload.text}\n> `);
  });

  console.log('\n[Status] Ready and listening for remote peer discovery and connections.');
  console.log('Commands:');
  console.log('  send <targetNodeId> <message>  - Send message to remote AEGIS node');
  console.log('  connect <host> <port>         - Connect to peer by host and port');
  console.log('  list                           - List discovered peers in PeerRegistry');
  console.log('  exit                           - Exit diagnostic tool\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.setPrompt('> ');
  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    const parts = input.split(' ');
    const cmd = parts[0].toLowerCase();

    if (cmd === 'exit') {
      console.log('Shutting down AEGIS node...');
      await engine.shutdown();
      process.exit(0);
    } else if (cmd === 'list') {
      const peers = engine.peerRegistry.listPeers();
      console.log(`\nDiscovered Peers (${peers.length}):`);
      for (const p of peers) {
        console.log(`  • NodeId: ${p.nodeId} (${p.nodeName || 'unknown'}) | State: ${p.connectionState}`);
        for (const ep of p.endpoints) {
          console.log(`    └─ Endpoint: ${ep.transport}://${ep.host}:${ep.port} (Priority: ${ep.priority ?? 10})`);
        }
      }
      console.log('');
    } else if (cmd === 'connect' && parts[1] && parts[2]) {
      const connectHost = parts[1];
      const connectPort = parseInt(parts[2], 10);
      const tempId = `aegis://manual-${connectHost}-${connectPort}`;
      engine.peerRegistry.registerPeer({
        nodeId: tempId,
        endpoints: [{ transport: 'tcp', host: connectHost, port: connectPort, priority: 1 }],
        connectionState: 'DISCOVERED' as any
      });
      try {
        console.log(`Attempting connection to ${connectHost}:${connectPort}...`);
        await engine.connectionManager.connectToPeer(tempId);
        console.log(`✔ Connected to ${connectHost}:${connectPort}`);
      } catch (err: any) {
        console.error(`❌ Connection failed: ${err.message}`);
      }
    } else if (cmd === 'send' && parts.length >= 3) {
      const target = parts[1];
      const msgText = parts.slice(2).join(' ');
      try {
        await engine.messagingService.sendMessage(target, 'cli_chat', { text: msgText });
        console.log(`✔ Sent message to ${target}`);
      } catch (err: any) {
        console.error(`❌ Failed to send message: ${err.message}`);
      }
    } else {
      console.log('Unknown command. Available: send <targetNodeId> <text>, connect <host> <port>, list, exit');
    }

    rl.prompt();
  });
}

runRealTwoComputerVerification().catch((err) => {
  console.error('Fatal error running Real Two-Computer Verification tool:', err);
  process.exit(1);
});
