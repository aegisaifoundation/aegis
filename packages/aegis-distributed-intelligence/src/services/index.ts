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

  async discoverNodes(): Promise<string[]> {
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
    try {
      await this.host.getIpcManager().request(MessageType.REQUEST, {
        action: 'unregister_node',
        nodeId
      });
    } catch {}
  }

  getLocalPeer(nodeId: string) {
    return this.localPeers.get(nodeId);
  }

  getLocalPeers() {
    return Array.from(this.localPeers.entries()).map(([nodeId, peer]) => ({
      nodeId,
      host: peer.host,
      port: peer.port
    }));
  }
}

export class MessagingService {
  private localServer: net.Server | null = null;
  private listeners = new Map<string, Set<(payload: any, senderId: string) => void | Promise<void>>>();

  constructor(private host: IEngineIpcHost) {
    this.startLocalServer();
  }

  private startLocalServer() {
    const localPort = (this.host as any).lifecycle?.getConfigurationManager()?.get()?.port || 9900;
    const msgPort = localPort + 1;
    this.localServer = net.createServer((socket) => {
      let buffer = Buffer.alloc(0);
      const logDebug = (msg: string) => {
        try {
          fs.appendFileSync('workspace/logs/p2p_debug.log', `[${new Date().toISOString()}] [Socket ${socket.remoteAddress}:${socket.remotePort}] ${msg}\n`, 'utf8');
        } catch {}
      };
      logDebug('Connection received');
      socket.on('data', (chunk) => {
        logDebug(`Received chunk of size ${chunk.length}`);
        buffer = Buffer.concat([buffer, chunk]);
        while (buffer.length >= 4) {
          const payloadLen = buffer.readUInt32BE(0);
          logDebug(`Reading expected payload length: ${payloadLen}. Accumulator size: ${buffer.length}`);
          if (buffer.length >= 4 + payloadLen) {
            const payloadStr = buffer.subarray(4, 4 + payloadLen).toString('utf8');
            buffer = buffer.subarray(4 + payloadLen);
            logDebug(`Received complete payload of size ${payloadLen}: ${payloadStr}`);
            try {
              const parsed = JSON.parse(payloadStr);
              if (parsed.messageType && parsed.senderId) {
                logDebug(`Successfully parsed packet. messageType=${parsed.messageType}, senderId=${parsed.senderId}`);
                const packet = {
                  messageType: MessageType.EVENT,
                  payload: {
                    type: 'peer_message',
                    messageType: parsed.messageType,
                    senderId: parsed.senderId,
                    payload: parsed.payload
                  }
                };
                // Emit to local IPC
                this.host.getIpcManager().emit('packet', packet);
                // Also trigger local event callbacks directly if registered
                logDebug(`Delivering message to local listeners...`);
                this.deliverMessage(parsed.messageType, parsed.payload, parsed.senderId);
              } else {
                logDebug(`Parsed packet missing messageType or senderId: ${payloadStr}`);
              }
            } catch (err: any) {
              logDebug(`Failed to parse json: ${err.message}`);
              console.error('[MessagingService] Failed to parse JS fallback packet:', err);
            }
          } else {
            logDebug(`Waiting for more data. Need ${4 + payloadLen} bytes, currently have ${buffer.length}`);
            break;
          }
        }
      });
      socket.on('end', () => {
        logDebug('Socket connection closed by client');
      });
      socket.on('error', (err) => {
        logDebug(`Socket error: ${err.message}`);
      });
    });
    this.localServer.listen(msgPort, '0.0.0.0', () => {
      console.log(`[MessagingService] TS P2P Message Server listening on port ${msgPort} (JS fallback)`);
    });
    this.localServer.on('error', (err) => {
      console.error(`[MessagingService] Failed to start TS P2P Message Server: ${err.message}`);
    });
  }

  async sendMessage(targetNodeId: string, messageType: string, payload: Record<string, any>): Promise<void> {
    // 1. In-process check (Gautham's implementation)
    const targetEngine = activeEngines.get(targetNodeId);
    if (targetEngine) {
      const ourNodeName = (this.host as any).nodeName || 'unknown';
      targetEngine.messagingService.deliverMessage(messageType, payload, ourNodeName);
      return;
    }

    // 2. Try JS P2P direct fallback
    const discovery = (this.host as any).discoveryService as DiscoveryService;
    const peer = discovery?.getLocalPeer(targetNodeId);
    if (peer) {
      try {
        // Use port + 1 for the message service fallback
        await this.sendDirect(peer.host, peer.port + 1, messageType, payload);
        return;
      } catch (err: any) {
        console.warn(`[MessagingService] Direct TS P2P send to ${peer.host}:${peer.port + 1} failed: ${err.message}`);
        throw new Error(`Target node "${targetNodeId}" is unreachable: ${err.message}`);
      }
    }

    // 3. Try native C++ send
    await this.host.getIpcManager().request(MessageType.REQUEST, {
      action: 'send_message',
      targetNodeId,
      messageType,
      payload
    });
  }

  private sendDirect(host: string, port: number, messageType: string, payload: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const client = net.connect(port, host);
      client.setTimeout(3000);

      client.on('connect', () => {
        const ourNodeName = (this.host as any).nodeName || 'unknown';
        const msg = JSON.stringify({
          messageType,
          senderId: ourNodeName,
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
        reject(new Error('Connection timed out after 3000ms'));
      });

      client.on('error', reject);
    });
  }

  onMessage(messageType: string, callback: (payload: any, senderId: string) => void | Promise<void>): void {
    if (!this.listeners.has(messageType)) {
      this.listeners.set(messageType, new Set());
    }
    this.listeners.get(messageType)!.add(callback);

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
