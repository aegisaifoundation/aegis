import { MessageType } from '../ipc/MessageTypes.js';
import net from 'net';
import fs from 'fs';

export interface IEngineIpcHost {
  getIpcManager(): any;
}

export const activeEngines = new Map<string, any>();

export class DiscoveryService {
  private localPeers = new Map<string, { host: string; port: number }>();

  constructor(private host: IEngineIpcHost) {}

  private getRegistry(): any {
    return (this.host as any).peerRegistry;
  }

  async discoverNodes(): Promise<string[]> {
    const reg = this.getRegistry();
    if (reg) {
      const registeredPeers = reg.listPeers().map((p: any) => p.nodeId);
      return Array.from(new Set(registeredPeers));
    }
    try {
      const res = await this.host.getIpcManager().request(MessageType.REQUEST, { action: 'discover_nodes' });
      const nativeNodes = res?.nodes || [];
      return Array.from(new Set([...nativeNodes, ...Array.from(this.localPeers.keys())]));
    } catch {
      return Array.from(this.localPeers.keys());
    }
  }

  async registerNode(nodeId: string, host: string, port: number): Promise<void> {
    this.localPeers.set(nodeId, { host, port });
    const reg = this.getRegistry();
    if (reg && nodeId.startsWith('aegis://')) {
      reg.registerPeer({
        nodeId,
        endpoints: [{ transport: 'tcp', host, port, priority: 1 }],
        connectionState: 'DISCOVERED'
      });
    }
    try {
      await this.host.getIpcManager().request(MessageType.REQUEST, {
        action: 'register_node',
        nodeId,
        host,
        port
      });
    } catch (err: any) {
      console.log(`[DiscoveryService] Native IPC register_node timed out: ${err.message}. Registered '${nodeId}' at ${host}:${port} in JS transport fallback.`);
    }
  }

  async removeNode(nodeId: string): Promise<void> {
    this.localPeers.delete(nodeId);
    const reg = this.getRegistry();
    if (reg) {
      reg.removePeer(nodeId);
    }
    try {
      await this.host.getIpcManager().request(MessageType.REQUEST, {
        action: 'unregister_node',
        nodeId
      });
    } catch {}
  }

  getLocalPeer(nodeId: string) {
    const reg = this.getRegistry();
    if (reg) {
      const peer = reg.getPeer(nodeId);
      if (peer && peer.endpoints.length > 0) {
        return { host: peer.endpoints[0].host, port: peer.endpoints[0].port };
      }
    }
    return this.localPeers.get(nodeId);
  }

  getLocalPeers() {
    const reg = this.getRegistry();
    if (reg) {
      return reg.listPeers().map((p: any) => ({
        nodeId: p.nodeId,
        host: p.endpoints[0]?.host || '127.0.0.1',
        port: p.endpoints[0]?.port || 9901
      }));
    }
    return Array.from(this.localPeers.entries()).map(([nodeId, peer]) => ({
      nodeId,
      host: peer.host,
      port: peer.port
    }));
  }
}

export class MessagingService {
  private listeners = new Map<string, Set<(payload: any, senderId: string) => void | Promise<void>>>();

  constructor(private host: IEngineIpcHost) {}

  private getConnectionManager(): any {
    return (this.host as any).connectionManager;
  }

  async sendMessage(targetNodeId: string, messageType: string, payload: Record<string, any>): Promise<void> {
    if (!targetNodeId || typeof targetNodeId !== 'string' || !targetNodeId.startsWith('aegis://')) {
      throw new Error(`[AEGIS Network] Canonical nodeId is required for network operations. Received: "${targetNodeId}"`);
    }

    const localNodeId = (this.host as any).nodeId || (this.host as any).context?.nodeId;
    if (!localNodeId || typeof localNodeId !== 'string' || !localNodeId.startsWith('aegis://')) {
      throw new Error('[AEGIS Network] Canonical nodeId is required for network operations.');
    }

    // 1. In-process check
    const targetEngine = activeEngines.get(targetNodeId);
    if (targetEngine) {
      targetEngine.messagingService.deliverMessage(messageType, payload, localNodeId);
      return;
    }

    // 2. Try ConnectionManager if integrated
    const connMgr = this.getConnectionManager();
    if (connMgr) {
      try {
        await connMgr.sendPeerMessage(targetNodeId, messageType, payload);
        return;
      } catch (err: any) {
        console.warn(`[MessagingService] ConnectionManager send failed for ${targetNodeId}: ${err.message}`);
      }
    }

    // 3. Try JS P2P direct fallback
    const discovery = (this.host as any).discoveryService as DiscoveryService;
    const peer = discovery?.getLocalPeer(targetNodeId);
    if (peer) {
      try {
        await this.sendDirect(peer.host, peer.port + 1, messageType, payload, localNodeId);
        return;
      } catch (err: any) {
        console.warn(`[MessagingService] Direct TS P2P send to ${peer.host}:${peer.port + 1} failed: ${err.message}`);
        throw new Error(`Target node "${targetNodeId}" is unreachable: ${err.message}`);
      }
    }

    // 4. Try native C++ send
    await this.host.getIpcManager().request(MessageType.REQUEST, {
      action: 'send_message',
      targetNodeId,
      messageType,
      payload
    });
  }

  private sendDirect(host: string, port: number, messageType: string, payload: any, senderId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const client = net.connect(port, host);
      client.setTimeout(5000);

      client.on('connect', () => {
        const msg = JSON.stringify({
          messageType,
          senderId,
          payload
        });
        const lenBuf = Buffer.alloc(4);
        lenBuf.writeUInt32BE(msg.length, 0);
        client.write(Buffer.concat([lenBuf, Buffer.from(msg)]));
        client.end();
        resolve();
      });

      client.on('timeout', () => {
        client.destroy();
        reject(new Error('Connection timed out after 5000ms'));
      });

      client.on('error', reject);
    });
  }

  onMessage(messageType: string, callback: (payload: any, senderId: string) => void | Promise<void>): void {
    if (!this.listeners.has(messageType)) {
      this.listeners.set(messageType, new Set());
    }
    this.listeners.get(messageType)!.add(callback);

    const connMgr = this.getConnectionManager();
    if (connMgr) {
      connMgr.onMessage(messageType, callback);
    }

    this.host.getIpcManager().on('packet', (packet: any) => {
      if (packet.messageType === MessageType.EVENT && packet.payload?.type === 'peer_message') {
        const msg = packet.payload;
        if (msg.messageType === messageType) {
          callback(msg.payload, msg.senderId);
        }
      }
    });
  }

  deliverMessage(messageType: string, payload: any, senderId: string): void {
    const callbacks = this.listeners.get(messageType);
    if (callbacks) {
      for (const callback of callbacks) {
        Promise.resolve(callback(payload, senderId)).catch(err => {
          console.error(`Error in onMessage callback for ${messageType}:`, err);
        });
      }
    }
  }
}

export class TransportService {
  constructor(private host: IEngineIpcHost) {}

  async getStatus(): Promise<Record<string, any>> {
    try {
      const res = await this.host.getIpcManager().request(MessageType.REQUEST, { action: 'transport_status' });
      return res || { status: 'ONLINE', port: 9900 };
    } catch {
      return { status: 'ONLINE', port: 9900 };
    }
  }

  async getConnectionCount(): Promise<number> {
    try {
      const res = await this.host.getIpcManager().request(MessageType.REQUEST, { action: 'connection_count' });
      return typeof res?.count === 'number' ? res.count : 0;
    } catch {
      return 0;
    }
  }
}

export class ExecutionService {
  constructor(private host: IEngineIpcHost) {}

  async submitTask(task: any): Promise<void> {
    await this.host.getIpcManager().request(MessageType.REQUEST, {
      action: 'submit_task',
      task
    });
  }

  async cancelTask(taskId: string): Promise<void> {
    await this.host.getIpcManager().request(MessageType.REQUEST, {
      action: 'cancel_task',
      taskId
    });
  }

  onTaskCompleted(taskId: string, callback: (result: any) => void): void {
    this.host.getIpcManager().on('packet', (packet: any) => {
      if (packet.messageType === MessageType.EVENT && packet.payload?.type === 'task_completed') {
        const payload = packet.payload;
        if (payload.taskId === taskId) {
          callback(payload.result);
        }
      }
    });
  }
}

export class CapabilityService {
  constructor(private host: IEngineIpcHost) {}

  async advertiseCapabilities(caps: any[]): Promise<void> {
    await this.host.getIpcManager().request(MessageType.REQUEST, {
      action: 'advertise_capabilities',
      capabilities: caps
    });
  }

  async getRemoteCapabilities(nodeId: string): Promise<any[]> {
    try {
      const res = await this.host.getIpcManager().request(MessageType.REQUEST, {
        action: 'get_remote_capabilities',
        nodeId
      });
      return res?.capabilities || [];
    } catch {
      return [];
    }
  }
}

export class ResourceService {
  constructor(private host: IEngineIpcHost) {}

  async getAvailableResources(): Promise<Record<string, any>> {
    try {
      const res = await this.host.getIpcManager().request(MessageType.REQUEST, { action: 'local_resources' });
      return res || { cpu: 0.1, gpu: 0.0, ramGb: 16 };
    } catch {
      return { cpu: 0.1, gpu: 0.0, ramGb: 16 };
    }
  }

  async getRemoteResources(nodeId: string): Promise<Record<string, any>> {
    try {
      const res = await this.host.getIpcManager().request(MessageType.REQUEST, {
        action: 'remote_resources',
        nodeId
      });
      return res || {};
    } catch {
      return {};
    }
  }
}

export class TrustService {
  constructor(private host: IEngineIpcHost) {}

  async verifyPeerTrust(nodeId: string): Promise<boolean> {
    try {
      const res = await this.host.getIpcManager().request(MessageType.REQUEST, {
        action: 'verify_trust',
        nodeId
      });
      return !!res?.trusted;
    } catch {
      return false;
    }
  }
}

export class SchedulerService {
  constructor(private host: IEngineIpcHost) {}

  async scheduleTask(task: any, candidateNodes: string[]): Promise<string> {
    const res = await this.host.getIpcManager().request(MessageType.REQUEST, {
      action: 'schedule_task',
      task,
      nodes: candidateNodes
    });
    return res?.selectedNodeId || '';
  }
}

export class EventService {
  constructor(private host: IEngineIpcHost) {}

  async publishEvent(eventName: string, payload: any): Promise<void> {
    await this.host.getIpcManager().request(MessageType.REQUEST, {
      action: 'publish_event',
      eventName,
      payload
    });
  }

  subscribe(eventName: string, callback: (payload: any) => void): void {
    this.host.getIpcManager().on('packet', (packet: any) => {
      if (packet.messageType === MessageType.EVENT && packet.payload?.type === 'distributed_event') {
        const ev = packet.payload;
        if (ev.eventName === eventName) {
          callback(ev.payload);
        }
      }
    });
  }
}
