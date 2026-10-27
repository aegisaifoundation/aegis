import path from 'path';
import os from 'os';
import { NodeManager } from '../../packages/aegis-node/src/NodeManager/NodeManager.js';
import { DistributedIntelligenceEngine } from '../../packages/aegis-distributed-intelligence/src/adapter/DistributedIntelligenceEngine.js';
import { PeerConnectionState } from '@aegis/sdk';

process.env.AEGIS_ALLOW_LOOPBACK = 'true';

async function main() {
  const port = parseInt(process.env.NODE_PORT || '20110', 10);
  const nodeDir = process.env.NODE_DIR || path.resolve(os.tmpdir(), 'aegis-test-' + port);
  const nodeName = process.env.NODE_NAME || `Node-${port}`;

  const mgr = new NodeManager(nodeDir);
  mgr.initialize(nodeName);
  const identity = mgr.getIdentity()!;

  const context: any = {
    nodeId: identity.nodeId,
    runtimeId: `runtime-${port}`,
    platform: os.platform(),
    architecture: os.arch(),
    bootMode: 'NORMAL',
    getNodeIdentity: () => ({
      nodeId: identity.nodeId,
      nodeName: identity.name,
      createdAt: identity.createdAt
    }),
    getWorkspacePath: () => nodeDir,
    getLogger: () => ({ info: () => {}, warn: () => {}, error: () => {} }),
    getConfig: () => ({ port, nodeName }),
    getSecrets: () => ({}),
    getService: () => undefined,
    getEventBus: () => ({ on: () => {}, off: () => {}, emit: () => {} })
  };

  const engine = new DistributedIntelligenceEngine();
  engine.port = port;
  engine.nodeName = nodeName;

  await engine.initialize(context);

  const actualMsgPort = engine.getBoundMessagePort();

  engine.messagingService.onMessage('multi_proc_test', (payload: any, senderId: string) => {
    if (process.send) {
      process.send({ event: 'message', payload, senderId });
    }
  });

  // Track connection state transitions
  const checkInterval = setInterval(() => {
    const peers = engine.peerRegistry.listPeers();
    for (const p of peers) {
      if (process.send) {
        process.send({ event: 'peer_state', peerId: p.nodeId, state: p.connectionState });
      }
    }
  }, 200);

  // Send ready event to parent
  if (process.send) {
    process.send({
      event: 'ready',
      nodeId: identity.nodeId,
      port,
      msgPort: actualMsgPort
    });
  }

  // Handle commands from parent
  process.on('message', async (cmd: any) => {
    if (cmd.action === 'register') {
      await engine.discoveryService.registerNode(cmd.targetId, cmd.host, cmd.port);
      if (process.send) process.send({ event: 'registered', targetId: cmd.targetId });
    } else if (cmd.action === 'connect') {
      try {
        await engine.connectionManager.connectToPeer(cmd.targetId);
        if (process.send) process.send({ event: 'connected', targetId: cmd.targetId });
      } catch (err: any) {
        if (process.send) process.send({ event: 'connect_error', error: err.message });
      }
    } else if (cmd.action === 'send') {
      try {
        await engine.messagingService.sendMessage(cmd.targetId, 'multi_proc_test', cmd.payload);
        if (process.send) process.send({ event: 'sent', targetId: cmd.targetId });
      } catch (err: any) {
        if (process.send) process.send({ event: 'send_error', error: err.message });
      }
    } else if (cmd.action === 'shutdown') {
      clearInterval(checkInterval);
      await engine.shutdown();
      if (process.send) process.send({ event: 'shutdown_complete' });
      process.exit(0);
    }
  });
}

main().catch((err) => {
  console.error('[MultiProcessChildNode] Crash:', err);
  process.exit(1);
});
