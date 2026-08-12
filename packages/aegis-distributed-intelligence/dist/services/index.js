import { MessageType } from '../ipc/MessageTypes.js';
import net from 'net';
export const activeEngines = new Map();
export class DiscoveryService {
    host;
    localPeers = new Set();
    peerAddresses = new Map();
    constructor(host) {
        this.host = host;
    }
    async discoverNodes() {
        try {
            const res = await this.host.getIpcManager().request(MessageType.REQUEST, { action: 'discover_nodes' });
            const nativeNodes = res?.nodes || [];
            const allNodes = new Set([...nativeNodes, ...this.localPeers]);
            return Array.from(allNodes);
        }
        catch {
            return Array.from(this.localPeers);
        }
    }
    async registerNode(nodeId, host, port) {
        this.localPeers.add(nodeId);
        this.peerAddresses.set(nodeId, { host, port });
        try {
            await this.host.getIpcManager().request(MessageType.REQUEST, {
                action: 'register_node',
                nodeId,
                host,
                port
            });
        }
        catch (err) {
            // Legacy C++ engine doesn't support the register_node command. Fall back to local registry.
            console.warn(`[DiscoveryService] Failed to register node natively (expected in legacy mode): ${err.message}`);
        }
    }
}
export class MessagingService {
    host;
    listeners = new Map();
    constructor(host) {
        this.host = host;
    }
    async sendMessage(targetNodeId, messageType, payload) {
        // 1. In-process check: if target is running in the same process, deliver message directly
        const targetEngine = activeEngines.get(targetNodeId);
        if (targetEngine) {
            const ourNodeName = this.host.nodeName || 'unknown';
            targetEngine.messagingService.deliverMessage(messageType, payload, ourNodeName);
            return;
        }
        // 2. Direct TCP connection to target port if peerAddress is known (P2P Remote Fallback)
        const peerAddr = this.host.discoveryService?.peerAddresses?.get(targetNodeId);
        if (peerAddr) {
            try {
                await new Promise((resolve, reject) => {
                    // Construct native C++ P2P wrapper message
                    const type = 'TASK_DISPATCH';
                    const body = JSON.stringify({
                        taskId: 'aegis-msg-' + Math.floor(Math.random() * 100000),
                        sourceNode: this.host.nodeName || 'node-local',
                        taskType: messageType,
                        payload
                    });
                    const payloadStr = `${type}|${body}`;
                    const payloadBuffer = Buffer.from(payloadStr, 'utf8');
                    const lengthBuffer = Buffer.alloc(4);
                    lengthBuffer.writeUInt32BE(payloadBuffer.length, 0);
                    const client = net.connect({ host: peerAddr.host, port: peerAddr.port, timeout: 3000 }, () => {
                        client.write(lengthBuffer);
                        client.write(payloadBuffer);
                        client.end();
                        resolve();
                    });
                    client.on('error', reject);
                });
                return;
            }
            catch (err) {
                console.warn(`[MessagingService] Direct TCP send to ${targetNodeId} (${peerAddr.host}:${peerAddr.port}) failed: ${err.message}`);
            }
        }
        // 3. Native fall-through
        try {
            await this.host.getIpcManager().request(MessageType.REQUEST, {
                action: 'send_message',
                targetNodeId,
                messageType,
                payload
            });
        }
        catch (err) {
            console.warn(`[MessagingService] Failed to send native message to ${targetNodeId}: ${err.message}`);
        }
    }
    onMessage(messageType, callback) {
        if (!this.listeners.has(messageType)) {
            this.listeners.set(messageType, new Set());
        }
        this.listeners.get(messageType).add(callback);
        this.host.getIpcManager().on('packet', (packet) => {
            if (packet.messageType === MessageType.EVENT && packet.payload?.type === 'peer_message') {
                const msg = packet.payload;
                if (msg.messageType === messageType) {
                    callback(msg.payload, msg.senderId);
                }
            }
        });
    }
    // Deliver in-memory messages directly
    deliverMessage(messageType, payload, senderId) {
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
    host;
    constructor(host) {
        this.host = host;
    }
    async getStatus() {
        try {
            const res = await this.host.getIpcManager().request(MessageType.REQUEST, { action: 'transport_status' });
            return res || { status: 'ONLINE', port: 9900 };
        }
        catch {
            return { status: 'ONLINE', port: 9900 };
        }
    }
    async getConnectionCount() {
        try {
            const res = await this.host.getIpcManager().request(MessageType.REQUEST, { action: 'connection_count' });
            return typeof res?.count === 'number' ? res.count : 0;
        }
        catch {
            return 0;
        }
    }
}
export class ExecutionService {
    host;
    constructor(host) {
        this.host = host;
    }
    async submitTask(task) {
        await this.host.getIpcManager().request(MessageType.REQUEST, {
            action: 'submit_task',
            task
        });
    }
    async cancelTask(taskId) {
        await this.host.getIpcManager().request(MessageType.REQUEST, {
            action: 'cancel_task',
            taskId
        });
    }
    onTaskCompleted(taskId, callback) {
        this.host.getIpcManager().on('packet', (packet) => {
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
    host;
    constructor(host) {
        this.host = host;
    }
    async advertiseCapabilities(caps) {
        await this.host.getIpcManager().request(MessageType.REQUEST, {
            action: 'advertise_capabilities',
            capabilities: caps
        });
    }
    async getRemoteCapabilities(nodeId) {
        try {
            const res = await this.host.getIpcManager().request(MessageType.REQUEST, {
                action: 'get_remote_capabilities',
                nodeId
            });
            return res?.capabilities || [];
        }
        catch {
            return [];
        }
    }
}
export class ResourceService {
    host;
    constructor(host) {
        this.host = host;
    }
    async getAvailableResources() {
        try {
            const res = await this.host.getIpcManager().request(MessageType.REQUEST, { action: 'local_resources' });
            return res || { cpu: 0.1, gpu: 0.0, ramGb: 16 };
        }
        catch {
            return { cpu: 0.1, gpu: 0.0, ramGb: 16 };
        }
    }
    async getRemoteResources(nodeId) {
        try {
            const res = await this.host.getIpcManager().request(MessageType.REQUEST, {
                action: 'remote_resources',
                nodeId
            });
            return res || {};
        }
        catch {
            return {};
        }
    }
}
export class TrustService {
    host;
    constructor(host) {
        this.host = host;
    }
    async verifyPeerTrust(nodeId) {
        try {
            const res = await this.host.getIpcManager().request(MessageType.REQUEST, {
                action: 'verify_trust',
                nodeId
            });
            return !!res?.trusted;
        }
        catch {
            return false;
        }
    }
}
export class SchedulerService {
    host;
    constructor(host) {
        this.host = host;
    }
    async scheduleTask(task, candidateNodes) {
        const res = await this.host.getIpcManager().request(MessageType.REQUEST, {
            action: 'schedule_task',
            task,
            nodes: candidateNodes
        });
        return res?.selectedNodeId || '';
    }
}
export class EventService {
    host;
    constructor(host) {
        this.host = host;
    }
    async publishEvent(eventName, payload) {
        await this.host.getIpcManager().request(MessageType.REQUEST, {
            action: 'publish_event',
            eventName,
            payload
        });
    }
    subscribe(eventName, callback) {
        this.host.getIpcManager().on('packet', (packet) => {
            if (packet.messageType === MessageType.EVENT && packet.payload?.type === 'distributed_event') {
                const ev = packet.payload;
                if (ev.eventName === eventName) {
                    callback(ev.payload);
                }
            }
        });
    }
}
//# sourceMappingURL=index.js.map