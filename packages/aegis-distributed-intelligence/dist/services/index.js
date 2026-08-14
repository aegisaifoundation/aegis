import { MessageType } from '../ipc/MessageTypes.js';
import net from 'net';
export const activeEngines = new Map();
export class DiscoveryService {
    host;
    localPeers = new Map();
    constructor(host) {
        this.host = host;
    }
    async discoverNodes() {
        try {
            const res = await this.host.getIpcManager().request(MessageType.REQUEST, { action: 'discover_nodes' });
            const nativeNodes = res?.nodes || [];
            return Array.from(new Set([...nativeNodes, ...Array.from(this.localPeers.keys())]));
        }
        catch {
            return Array.from(this.localPeers.keys());
        }
    }
    async registerNode(nodeId, host, port) {
        this.localPeers.set(nodeId, { host, port });
        try {
            await this.host.getIpcManager().request(MessageType.REQUEST, {
                action: 'register_node',
                nodeId,
                host,
                port
            });
        }
        catch (err) {
            console.log(`[DiscoveryService] Native IPC register_node timed out: ${err.message}. Registered '${nodeId}' at ${host}:${port} in JS transport fallback.`);
        }
    }
    getLocalPeer(nodeId) {
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
    host;
    localServer = null;
    listeners = new Map();
    constructor(host) {
        this.host = host;
        this.startLocalServer();
    }
    startLocalServer() {
        const localPort = this.host.lifecycle?.getConfigurationManager()?.get()?.port || 9900;
        const msgPort = localPort + 1;
        this.localServer = net.createServer((socket) => {
            let buffer = Buffer.alloc(0);
            socket.on('data', (chunk) => {
                buffer = Buffer.concat([buffer, chunk]);
                while (buffer.length >= 4) {
                    const payloadLen = buffer.readUInt32BE(0);
                    if (buffer.length >= 4 + payloadLen) {
                        const payloadStr = buffer.subarray(4, 4 + payloadLen).toString('utf8');
                        buffer = buffer.subarray(4 + payloadLen);
                        try {
                            const parsed = JSON.parse(payloadStr);
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
                                // Emit to local IPC
                                this.host.getIpcManager().emit('packet', packet);
                                // Also trigger local event callbacks directly if registered
                                this.deliverMessage(parsed.messageType, parsed.payload, parsed.senderId);
                            }
                        }
                        catch (err) {
                            console.error('[MessagingService] Failed to parse JS fallback packet:', err);
                        }
                    }
                    else {
                        break;
                    }
                }
            });
            socket.on('error', () => { });
        });
        this.localServer.listen(msgPort, '0.0.0.0', () => {
            console.log(`[MessagingService] TS P2P Message Server listening on port ${msgPort} (JS fallback)`);
        });
        this.localServer.on('error', (err) => {
            console.error(`[MessagingService] Failed to start TS P2P Message Server: ${err.message}`);
        });
    }
    async sendMessage(targetNodeId, messageType, payload) {
        // 1. In-process check (Gautham's implementation)
        const targetEngine = activeEngines.get(targetNodeId);
        if (targetEngine) {
            const ourNodeName = this.host.nodeName || 'unknown';
            targetEngine.messagingService.deliverMessage(messageType, payload, ourNodeName);
            return;
        }
        // 2. Try JS P2P direct fallback
        const discovery = this.host.discoveryService;
        const peer = discovery?.getLocalPeer(targetNodeId);
        if (peer) {
            try {
                // Use port + 1 for the message service fallback
                await this.sendDirect(peer.host, peer.port + 1, messageType, payload);
                return;
            }
            catch (err) {
                console.warn(`[MessagingService] Direct TS P2P send to ${peer.host}:${peer.port + 1} failed: ${err.message}. Trying native send...`);
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
    sendDirect(host, port, messageType, payload) {
        return new Promise((resolve, reject) => {
            const client = net.connect(port, host, () => {
                const ourNodeName = this.host.nodeName || 'unknown';
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
            client.on('error', reject);
        });
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