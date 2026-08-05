import { MessageType } from '../ipc/MessageTypes.js';
import net from 'net';
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
}
export class MessagingService {
    host;
    localServer = null;
    constructor(host) {
        this.host = host;
        this.startLocalServer();
    }
    startLocalServer() {
        const localPort = this.host.lifecycle?.getConfigurationManager()?.get()?.port || 9901;
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
                    }
                    catch { }
                }
            });
            socket.on('error', () => { });
        });
        this.localServer.listen(msgPort, '0.0.0.0', () => {
            console.log(`[MessagingService] TS P2P Message Server listening on port ${msgPort} (JS fallback)`);
        });
        this.localServer.on('error', () => { });
    }
    async sendMessage(targetNodeId, messageType, payload) {
        // 1. Try JS P2P direct fallback
        const discovery = this.host.discoveryService;
        const peer = discovery?.getLocalPeer(targetNodeId);
        if (peer) {
            try {
                // Use port + 1 (9902) for the message service fallback
                await this.sendDirect(peer.host, peer.port + 1, messageType, payload);
                return;
            }
            catch (err) {
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
    sendDirect(host, port, messageType, payload) {
        return new Promise((resolve, reject) => {
            const client = net.connect(port, host, () => {
                const msg = JSON.stringify({
                    messageType,
                    senderId: this.host.context?.runtimeId || 'my-node',
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
    onMessage(messageType, callback) {
        this.host.getIpcManager().on('packet', (packet) => {
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