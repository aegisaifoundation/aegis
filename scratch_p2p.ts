import path from 'path';
import { fileURLToPath } from 'url';
import { DistributedIntelligenceEngine } from './packages/aegis-distributed-intelligence/dist/adapter/DistributedIntelligenceEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildContext = (name: string) => ({
  runtimeId: `runtime-${name}`,
  kernelVersion: '1.0.0',
  bootId: `boot-${name}`,
  platform: 'win32',
  architecture: 'x64',
  bootMode: 'NORMAL' as const,
  getWorkspacePath: () => path.resolve(__dirname, 'workspace'),
  getLogger: () => ({
    info:  (msg: string, src: string) => console.log(`    [${name}:${src}] ${msg}`),
    warn:  (msg: string, src: string) => console.warn(`    [${name}:${src}] WARN: ${msg}`),
    error: (msg: string, src: string) => console.error(`    [${name}:${src}] ERROR: ${msg}`),
  }),
  getConfig:   () => ({}),
  getSecrets:  () => ({}),
  getService:  (_: string) => undefined,
  getEventBus: () => ({
    on: () => {},
    off: () => {},
    emit: (ev: string, payload: any) => console.log(`    [${name}:EventBus] ${ev}:`, JSON.stringify(payload)),
  }),
});

async function main() {
  console.log('=== AEGIS P2P Communication Demo ===\n');

  const nodeA = new DistributedIntelligenceEngine();
  const nodeB = new DistributedIntelligenceEngine();

  console.log('[1] Initializing nodes...');
  await nodeA.initialize(buildContext('NodeA'));
  await nodeB.initialize(buildContext('NodeB'));

  console.log('[2] Configuring custom ports...');
  await nodeA.configure({ nodeName: 'node-A', port: 9801 });
  await nodeB.configure({ nodeName: 'node-B', port: 9802 });

  console.log('[3] Starting Node A and Node B...');
  await nodeA.start();
  await nodeB.start();

  console.log('✔ Both processes spawned successfully.');

  // Set up messaging listeners
  nodeA.messagingService.onMessage('hello_p2p', (payload, senderId) => {
    console.log(`\n🎉 [Node A received hello_p2p] from ${senderId}: "${payload.text}"`);
    // Reply back
    nodeA.messagingService.sendMessage(senderId, 'reply_p2p', { text: 'Hello back, Node B!' })
      .catch(err => console.error('Failed replying:', err));
  });

  nodeB.messagingService.onMessage('reply_p2p', (payload, senderId) => {
    console.log(`\n🎉 [Node B received reply_p2p] from ${senderId}: "${payload.text}"`);
  });

  console.log('\n[4] Inter-node discovery registration...');
  await nodeA.discoveryService.registerNode('node-B', '127.0.0.1', 9802);
  await nodeB.discoveryService.registerNode('node-A', '127.0.0.1', 9801);
  console.log('✔ Peer configurations exchanged.');

  console.log('\n[5] Discovering peers from Node A...');
  const peers = await nodeA.discoveryService.discoverNodes();
  console.log('Discovered peers from Node A:', peers);

  console.log('\n[6] Sending P2P message: Node B -> Node A...');
  await nodeB.messagingService.sendMessage('node-A', 'hello_p2p', { text: 'Hello Node A, I am Node B!' });

  // Wait 1.5 seconds for message exchange
  await new Promise(r => setTimeout(r, 1500));

  console.log('\n[7] Shutting down nodes...');
  await nodeA.shutdown();
  await nodeB.shutdown();
  console.log('✔ Shutdown complete. Both processes terminated cleanly.');
}

main().catch(err => {
  console.error('P2P demo crashed:', err);
  process.exit(1);
});
