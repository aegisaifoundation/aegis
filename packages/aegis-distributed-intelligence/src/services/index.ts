import { MessageType } from '../ipc/MessageTypes.js';

export interface IEngineIpcHost {
  getIpcManager(): any;
}

export class DiscoveryService {
  constructor(private host: IEngineIpcHost) {}

  async discoverNodes(): Promise<string[]> {
    try {
      const res = await this.host.getIpcManager().request(MessageType.REQUEST, { action: 'discover_nodes' });
      return res?.nodes || [];
    } catch {
      return [];
    }
  }

  async registerNode(nodeId: string, host: string, port: number): Promise<void> {
    await this.host.getIpcManager().request(MessageType.REQUEST, {
      action: 'register_node',
      nodeId,
      host,
      port
    });
  }
}

export class MessagingService {
  constructor(private host: IEngineIpcHost) {}

  async sendMessage(targetNodeId: string, messageType: string, payload: Record<string, any>): Promise<void> {
    await this.host.getIpcManager().request(MessageType.REQUEST, {
      action: 'send_message',
      targetNodeId,
      messageType,
      payload
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
