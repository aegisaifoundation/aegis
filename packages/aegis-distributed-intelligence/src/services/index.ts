import { MessageType } from '../ipc/MessageTypes.js';
import net from 'net';

export interface IEngineIpcHost {
  getIpcManager(): any;
}

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

  getLocalPeer(nodeId: string) {
    return this.localPeers.get(nodeId);
  }
}

export class MessagingService {
  private localServer: net.Server | null = null;

  constructor(private host: IEngineIpcHost) {
    this.startLocalServer();
  }

  private startLocalServer() {
    const localPort = (this.host as any).lifecycle?.getConfigurationManager()?.get()?.port || 9901;
    const msgPort = localPort + 1;
    this.localServer = net.createServer((socket) => {
      let dataBuffer = '';
      socket.on('data', (chunk) => {
        dataBuffer += chunk.toString();
        const lines = dataBuffer.split('\n');
        dataBuffer = lines.pop() ?? '';
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.messageType && parsed.senderId) {
              const packet = {
                messageType: MessageType.EVENT,
                payload: {
                  type: 'peer_message',
                  messageType: parsed.messageType,
                  senderId: parsed.senderId,
                  payload: parsed.payload
                }
              };
              this.host.getIpcManager().emit('packet', packet);
            }
          } catch {}
        }
      });
      socket.on('error', () => {});
    });
    this.localServer.listen(msgPort, '0.0.0.0', () => {
      console.log(`[MessagingService] TS P2P Message Server listening on port ${msgPort} (JS fallback)`);
    });
    this.localServer.on('error', () => {});
  }

  async sendMessage(targetNodeId: string, messageType: string, payload: Record<string, any>): Promise<void> {
    // 1. Try JS P2P direct fallback
    const discovery = (this.host as any).discoveryService as DiscoveryService;
    const peer = discovery?.getLocalPeer(targetNodeId);
    if (peer) {
      try {
        // Use port + 1 (9902) for the message service fallback
        await this.sendDirect(peer.host, peer.port + 1, messageType, payload);
        return;
      } catch (err: any) {
        console.warn(`[MessagingService] Direct TS P2P send to ${peer.host}:${peer.port + 1} failed: ${err.message}. Trying native send...`);
      }
    }

    // 2. Try native C++ send
    await this.host.getIpcManager().request(MessageType.REQUEST, {
      action: 'send_message',
      targetNodeId,
      messageType,
      payload
    });
  }

  private sendDirect(host: string, port: number, messageType: string, payload: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const client = net.connect(port, host, () => {
        const msg = JSON.stringify({
          messageType,
          senderId: (this.host as any).context?.runtimeId || 'my-node',
          payload
        }) + '\n';
        client.write(msg, () => {
          client.end();
          resolve();
        });
      });
      client.on('error', reject);
    });
  }

  onMessage(messageType: string, callback: (payload: any, senderId: string) => void | Promise<void>): void {
    this.host.getIpcManager().on('packet', (packet: any) => {
      if (packet.messageType === MessageType.EVENT && packet.payload?.type === 'peer_message') {
        const msg = packet.payload;
        if (msg.messageType === messageType) {
          callback(msg.payload, msg.senderId);
        }
      }
    });
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
