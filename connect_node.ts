import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import { DistributedIntelligenceEngine } from './packages/aegis-distributed-intelligence/dist/adapter/DistributedIntelligenceEngine.js';
import { CollaborationEngine } from './packages/aegis-collaboration/dist/CollaborationEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to construct a runtime context for standalone engines
const buildContext = (nodeName: string) => ({
  runtimeId: `node-${nodeName}`,
  kernelVersion: '1.0.0',
  bootId: `boot-${nodeName}`,
  platform: process.platform,
  architecture: process.arch,
  bootMode: 'NORMAL' as const,
  getWorkspacePath: () => path.resolve(__dirname, 'workspace'),
  getLogger: () => ({
    info:  (msg: string, src: string) => console.log(`[${nodeName}:${src}] ${msg}`),
    warn:  (msg: string, src: string) => console.warn(`[${nodeName}:${src}] WARN: ${msg}`),
    error: (msg: string, src: string) => console.error(`[${nodeName}:${src}] ERROR: ${msg}`),
  }),
  getConfig:   () => ({}),
  getSecrets:  () => ({}),
  getService:  (_: string) => undefined,
  getEventBus: () => ({
    on: () => {},
    off: () => {},
    emit: (ev: string, payload: any) => console.log(`[EventBus] ${ev}:`, JSON.stringify(payload)),
  }),
});

async function main() {
  const targetIp = '10.179.223.54';
  const targetPort = 9900;
  const localPort = 9901; // Avoid conflict with default port 9900 if daemon is running locally
  const localNodeName = 'my-node';

  console.log('===========================================================');
  console.log('      AEGIS Node P2P Connection & Communication tool      ');
  console.log('===========================================================');
  console.log(`Local Node name   : ${localNodeName}`);
  console.log(`Local Node Port   : ${localPort}`);
  console.log(`Target Remote IP  : ${targetIp}`);
  console.log(`Target Remote Port: ${targetPort}\n`);

  console.log('[1] Initializing P2P Distributed Intelligence Engine...');
  const node = new DistributedIntelligenceEngine();
  await node.initialize(buildContext(localNodeName));

  console.log('[2] Configuring engine local network settings...');
  await node.configure({ nodeName: localNodeName, port: localPort });

  console.log('[3] Starting local node P2P services...');
  await node.start();
  console.log('✔ P2P Service Engine active.');

  // Set up message listener for incoming replies/messages
  node.messagingService.onMessage('hello_p2p', (payload, senderId) => {
    console.log(`\n📬 [Message Received] from ${senderId}: "${payload.text}"`);
  });

  node.messagingService.onMessage('reply_p2p', (payload, senderId) => {
    console.log(`\n📬 [Reply Received] from ${senderId}: "${payload.text}"`);
  });

  console.log('\n[4] Registering target remote node in local Discovery Registry...');
  await node.discoveryService.registerNode('remote-node', targetIp, targetPort);
  console.log(`✔ Registered target remote node: 'remote-node' @ ${targetIp}:${targetPort}`);

  console.log('\n[5] Attempting peer discovery check...');
  const peers = await node.discoveryService.discoverNodes();
  console.log('Discovered active peers list:', peers);

  console.log('\n[6] Initializing interactive communication terminal...');
  console.log('    Type your message to send. Type "exit" or "quit" to stop.');
  console.log('-----------------------------------------------------------');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const promptUser = () => {
    rl.question('\nSend Message > ', async (input) => {
      const msg = input.trim();
      if (msg.toLowerCase() === 'exit' || msg.toLowerCase() === 'quit') {
        console.log('\nShutting down client connection...');
        rl.close();
        await node.shutdown();
        console.log('✔ Engine stopped cleanly. Goodbye!');
        process.exit(0);
      }

      if (msg.length > 0) {
        try {
          console.log(`Sending message to 'remote-node'...`);
          await node.messagingService.sendMessage('remote-node', 'hello_p2p', { text: msg });
          console.log('✔ Sent.');
        } catch (err: any) {
          console.error(`✖ Failed to send message: ${err.message}`);
        }
      }
      promptUser();
    });
  };

  promptUser();
}

main().catch(err => {
  console.error('Fatal crash:', err);
  process.exit(1);
});
