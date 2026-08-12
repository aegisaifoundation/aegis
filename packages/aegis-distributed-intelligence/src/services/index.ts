import { MessageType } from '../ipc/MessageTypes.js';
import net from 'net';

export interface IEngineIpcHost {
  getIpcManager(): any;
  getContext?(): any;
  getService?(token: string): any;
}

export class DiscoveryService {
  private registeredPeers = new Map<string, { host: string; port: number }>();

  constructor(private host: IEngineIpcHost) {}

  async discoverNodes(): Promise<string[]> {
    try {
      const res = await this.host.getIpcManager().request(MessageType.REQUEST, { action: 'discover_nodes' });
      if (res?.nodes && res.nodes.length > 0) {
        return res.nodes;
      }
    } catch {}
    return Array.from(this.registeredPeers.keys());
  }

  async registerNode(nodeId: string, host: string, port: number): Promise<void> {
    this.registeredPeers.set(nodeId, { host, port });
    try {
      await this.host.getIpcManager().request(MessageType.REQUEST, {
        action: 'register_node',
        nodeId,
        host,
        port
      });
    } catch (err: any) {
      console.warn(`[DiscoveryService] Register node via IPC timed out or failed: ${err.message}. Peer registered locally in JS fallback.`);
    }
  }

  getPeerAddress(nodeId: string): { host: string; port: number } | undefined {
    return this.registeredPeers.get(nodeId);
  }
}

export class MessagingService {
  constructor(private host: IEngineIpcHost) {}

  async sendMessage(targetNodeId: string, messageType: string, payload: Record<string, any>): Promise<void> {
    try {
      await this.host.getIpcManager().request(MessageType.REQUEST, {
        action: 'send_message',
        targetNodeId,
        messageType,
        payload
      });
      return;
    } catch (err: any) {
      console.warn(`[MessagingService] Send message via IPC failed: ${err.message}. Attempting direct TCP P2P fallback...`);
    }

    // Direct TCP P2P send fallback
    const discovery = (this.host as any).discoveryService;
    const peer = discovery?.getPeerAddress(targetNodeId);
    if (!peer) {
      throw new Error(`[MessagingService] Target node ${targetNodeId} not found in discovery registry.`);
    }

    await new Promise<void>((resolve, reject) => {
      const client = net.connect(peer.port, peer.host, () => {
        // C++ TcpTransport structure expects length-prefixed payload:
        // 4 bytes length (uint32_t big endian) + string payload
        const serialized = JSON.stringify({
          type: 'peer_message',
          senderId: this.host.getContext?.()?.runtimeId || 'local-node',
          messageType,
          payload
        });
        const lenBuf = Buffer.alloc(4);
        lenBuf.writeUInt32BE(serialized.length, 0);
        client.write(Buffer.concat([lenBuf, Buffer.from(serialized)]));
        client.end();
        resolve();
      });

      client.on('error', (err) => {
        reject(new Error(`Direct TCP P2P connection to ${targetNodeId} (${peer.host}:${peer.port}) failed: ${err.message}`));
      });
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
    try {
      await this.host.getIpcManager().request(MessageType.REQUEST, {
        action: 'advertise_capabilities',
        capabilities: caps
      });
    } catch (err: any) {
      console.warn(`[CapabilityService] Failed to advertise capabilities: ${err.message}`);
    }
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
