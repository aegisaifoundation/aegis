import path from 'path';
import os from 'os';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { NodeManager } from './packages/aegis-node/src/NodeManager/NodeManager.js';
import { DistributedIntelligenceEngine, getLocalIpAddress } from './packages/aegis-distributed-intelligence/src/adapter/DistributedIntelligenceEngine.js';
import { IRuntimeContext_v1 } from '@aegis/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const args = process.argv.slice(2);
  let nodeName = process.env.AEGIS_NODE_NAME || 'AEGIS Node';
  let port = parseInt(process.env.AEGIS_PORT || '19910', 10);
  let workspaceDir = process.env.AEGIS_WORKSPACE || '';
  let targetId = process.env.AEGIS_TARGET_ID || '';
  let targetIp = process.env.AEGIS_TARGET_IP || '';
  let targetPort = parseInt(process.env.AEGIS_TARGET_PORT || '0', 10);
  let singleMessage = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--node-name' && args[i + 1]) nodeName = args[++i];
    else if (args[i] === '--port' && args[i + 1]) port = parseInt(args[++i], 10);
    else if (args[i] === '--workspace' && args[i + 1]) workspaceDir = path.resolve(args[++i]);
    else if (args[i] === '--target-id' && args[i + 1]) targetId = args[++i];
    else if (args[i] === '--target-ip' && args[i + 1]) targetIp = args[++i];
    else if (args[i] === '--target-port' && args[i + 1]) targetPort = parseInt(args[++i], 10);
    else if (args[i] === '--send-message' && args[i + 1]) singleMessage = args[++i];
  }

  if (!workspaceDir) {
    workspaceDir = path.resolve(os.homedir(), '.aegis', `node-${port}`);
  }

  console.log('===========================================================');
  console.log('      AEGIS Node P2P Connection & Communication Tool       ');
  console.log('===========================================================');

  // 1. Initialize persistent cryptographic identity via NodeManager
  console.log('[1] Loading / Initializing persistent node identity...');
  const nodeMgr = new NodeManager(workspaceDir);
  nodeMgr.initialize(nodeName);
  const identity = nodeMgr.getIdentity();

  if (!identity || !identity.nodeId.startsWith('aegis://')) {
    throw new Error(`Failed to load valid canonical identity from ${workspaceDir}`);
  }

  const localIp = getLocalIpAddress();
  console.log(`  • Canonical Node ID : ${identity.nodeId}`);
  console.log(`  • Node Display Name : ${identity.name}`);
  console.log(`  • Workspace Root    : ${workspaceDir}`);
  console.log(`  • Local LAN IP      : ${localIp}`);
  console.log(`  • Configured Base   : ${port}`);
  console.log(`  • Message Port Req  : ${port + 1}`);

  // 2. Build full runtime context
  const context: IRuntimeContext_v1 = {
    nodeId: identity.nodeId,
    runtimeId: `runtime-${port}`,
    kernelVersion: '1.0.0',
    bootId: `boot-${identity.nodeId.replace('aegis://', '')}`,
    platform: os.platform(),
    architecture: os.arch(),
    bootMode: 'NORMAL',
    getNodeIdentity: () => ({
      nodeId: identity.nodeId,
      nodeName: identity.name,
      createdAt: identity.createdAt,
      publicKey: identity.publicKey,
      fingerprint: identity.fingerprint
    }),
    getWorkspacePath: () => workspaceDir,
    getLogger: () => ({
      info:  (msg: string, src?: string) => console.log(`[${identity.name}:${src || 'log'}] ${msg}`),
      warn:  (msg: string, src?: string) => console.warn(`[${identity.name}:${src || 'log'}] WARN: ${msg}`),
      error: (msg: string, src?: string) => console.error(`[${identity.name}:${src || 'log'}] ERROR: ${msg}`),
    }),
    getConfig: () => ({ port, nodeName: identity.name }),
    getSecrets: () => ({}),
    getService: () => undefined as any,
    getEventBus: () => ({
      on: () => {},
      off: () => {},
      emit: () => {}
    })
  };

  // 3. Initialize DistributedIntelligenceEngine
  console.log('\n[2] Initializing Distributed Intelligence Engine...');
  const node = new DistributedIntelligenceEngine();
  node.port = port;
  node.nodeName = identity.name;
  await node.initialize(context);

  const actualMsgPort = node.getBoundMessagePort();
  console.log(`✔ P2P Transport active and listening on ${actualMsgPort}`);

  // 4. Set up incoming message listeners
  node.messagingService.onMessage('hello_p2p', (payload: any, senderId: string) => {
    console.log(`\n📬 [Message Received] from ${senderId}: "${payload.text || JSON.stringify(payload)}"`);
  });

  node.messagingService.onMessage('reply_p2p', (payload: any, senderId: string) => {
    console.log(`\n📬 [Reply Received] from ${senderId}: "${payload.text || JSON.stringify(payload)}"`);
  });

  node.messagingService.onMessage('cli_chat', (payload: any, senderId: string) => {
    console.log(`\n📬 [Chat Received] from ${senderId}: "${payload.text || JSON.stringify(payload)}"`);
  });

  // 5. If target peer parameters provided, register and connect
  if (targetId && targetIp && targetPort) {
    if (!targetId.startsWith('aegis://')) {
      console.error(`[ERROR] Target ID "${targetId}" is not a canonical aegis:// identity.`);
      await node.shutdown();
      process.exit(1);
    }

    console.log(`\n[3] Registering target peer: ${targetId} @ ${targetIp}:${targetPort}`);
    await node.discoveryService.registerNode(targetId, targetIp, targetPort);

    console.log(`[4] Connecting to target peer ${targetId}...`);
    try {
      await node.connectionManager.connectToPeer(targetId);
      console.log(`✔ Handshake verified and connection ACTIVE with ${targetId}`);

      if (singleMessage) {
        console.log(`[5] Sending message: "${singleMessage}"...`);
        await node.messagingService.sendMessage(targetId, 'hello_p2p', { text: singleMessage });
        console.log(`✔ Message successfully transmitted.`);
        // Allow brief flush window before clean shutdown
        await new Promise(r => setTimeout(r, 1000));
        await node.shutdown();
        process.exit(0);
      }
    } catch (err: any) {
      console.error(`✖ Connection to ${targetId} failed: ${err.message}`);
    }
  }

  // 6. Interactive Terminal
  console.log('\n[Ready] Interactive terminal ready. Commands:');
  console.log('  register <targetNodeId> <ip> <port> - Register remote peer');
  console.log('  connect <targetNodeId>              - Connect & perform handshake');
  console.log('  send <targetNodeId> <message>       - Send message to peer');
  console.log('  list                                - List peers in registry');
  console.log('  exit / quit                         - Stop and shutdown node');
  console.log('-----------------------------------------------------------');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const promptUser = () => {
    rl.question('\nAEGIS > ', async (input) => {
      const line = input.trim();
      if (!line) {
        promptUser();
        return;
      }

      const parts = line.split(' ');
      const cmd = parts[0].toLowerCase();

      if (cmd === 'exit' || cmd === 'quit') {
        console.log('\nShutting down AEGIS node...');
        rl.close();
        await node.shutdown();
        console.log('✔ Clean shutdown complete. Goodbye!');
        process.exit(0);
      }

      if (cmd === 'list') {
        const peers = node.peerRegistry.listPeers();
        console.log(`\nKnown Peers (${peers.length}):`);
        for (const p of peers) {
          console.log(`  • ${p.nodeId} (${p.nodeName || 'unknown'}) - State: ${p.connectionState}`);
          for (const ep of p.endpoints) {
            console.log(`    └─ ${ep.transport}://${ep.host}:${ep.port} (prio: ${ep.priority ?? 10})`);
          }
        }
      } else if (cmd === 'register' && parts.length >= 4) {
        const tId = parts[1];
        const tIp = parts[2];
        const tPort = parseInt(parts[3], 10);
        if (!tId.startsWith('aegis://')) {
          console.error('Error: Peer ID must be a canonical aegis:// identity');
        } else {
          await node.discoveryService.registerNode(tId, tIp, tPort);
          console.log(`✔ Registered peer ${tId} at ${tIp}:${tPort}`);
        }
      } else if (cmd === 'connect' && parts[1]) {
        const tId = parts[1];
        try {
          console.log(`Connecting to ${tId}...`);
          await node.connectionManager.connectToPeer(tId);
          console.log(`✔ Connection ACTIVE with ${tId}`);
        } catch (err: any) {
          console.error(`✖ Connection failed: ${err.message}`);
        }
      } else if (cmd === 'send' && parts.length >= 3) {
        const tId = parts[1];
        const text = parts.slice(2).join(' ');
        try {
          console.log(`Sending to ${tId}...`);
          await node.messagingService.sendMessage(tId, 'cli_chat', { text });
          console.log('✔ Message sent.');
        } catch (err: any) {
          console.error(`✖ Send failed: ${err.message}`);
        }
      } else {
        console.log('Commands: register <id> <ip> <port>, connect <id>, send <id> <text>, list, exit');
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
