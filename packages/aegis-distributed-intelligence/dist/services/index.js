import { MessageType } from '../ipc/MessageTypes.js';
import net from 'net';
export const activeEngines = new Map();
export class DiscoveryService {
    host;
    localPeers = new Map();
    constructor(host) {
        this.host = host;
    }
    getRegistry() {
        return this.host.peerRegistry;
    }
    async discoverNodes() {
        const reg = this.getRegistry();
        if (reg) {
            const registeredPeers = reg.listPeers().map((p) => p.nodeId);
            return Array.from(new Set(registeredPeers));
        }
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
        }
        catch (err) {
            console.log(`[DiscoveryService] Native IPC register_node timed out: ${err.message}. Registered '${nodeId}' at ${host}:${port} in JS transport fallback.`);
        }
    }
    async removeNode(nodeId) {
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
        }
        catch { }
    }
    getLocalPeer(nodeId) {
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
            return reg.listPeers().map((p) => ({
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
    host;
    listeners = new Map();
    constructor(host) {
        this.host = host;
    }
    getConnectionManager() {
        return this.host.connectionManager;
    }
    getMessageRouter() {
        return this.host.messageRouter;
    }
    async sendMessage(targetNodeId, messageType, payload) {
        if (!targetNodeId || typeof targetNodeId !== 'string' || !targetNodeId.startsWith('aegis://')) {
            throw new Error(`[AEGIS Network] Canonical nodeId is required for network operations. Received: "${targetNodeId}"`);
        }
        const localNodeId = this.host.nodeId || this.host.context?.nodeId;
        if (!localNodeId || typeof localNodeId !== 'string' || !localNodeId.startsWith('aegis://')) {
            throw new Error('[AEGIS Network] Canonical nodeId is required for network operations.');
        }
        // 1. Try AegisMessageRouter if available
        const router = this.getMessageRouter();
        if (router) {
            const envelope = router.getFactory().createMessage({
                messageType,
                payload,
                targetNodeId,
                sourceEngine: 'distributed-intelligence'
            });
            await router.send(envelope);
            return;
        }
        // 2. In-process check
        const targetEngine = activeEngines.get(targetNodeId);
        if (targetEngine) {
            targetEngine.messagingService.deliverMessage(messageType, payload, localNodeId);
            return;
        }
        // 3. Try ConnectionManager if integrated
        const connMgr = this.getConnectionManager();
        if (connMgr) {
            try {
                await connMgr.sendPeerMessage(targetNodeId, messageType, payload);
                return;
            }
            catch (err) {
                console.warn(`[MessagingService] ConnectionManager send failed for ${targetNodeId}: ${err.message}`);
            }
        }
        // 3. Try JS P2P direct fallback
        const discovery = this.host.discoveryService;
        const peer = discovery?.getLocalPeer(targetNodeId);
        if (peer) {
            try {
                await this.sendDirect(peer.host, peer.port + 1, messageType, payload, localNodeId);
                return;
            }
            catch (err) {
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
    sendDirect(host, port, messageType, payload, senderId) {
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
    onMessage(messageType, callback) {
        if (!this.listeners.has(messageType)) {
            this.listeners.set(messageType, new Set());
        }
        this.listeners.get(messageType).add(callback);
        const connMgr = this.getConnectionManager();
        if (connMgr) {
            connMgr.onMessage(messageType, callback);
        }
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
    getTaskManager() {
        return this.host.taskManager;
    }
    async submitTask(task) {
        const tm = this.getTaskManager();
        if (tm) {
            const created = tm.getTask(task.taskId) || tm.createTask({
                type: task.type || 'ENGINE.task',
                payload: task.payload || task,
                priority: task.priority,
                requirements: task.requirements,
                targetNodeId: task.targetNodeId
            });
            await tm.submitTask(created);
            return;
        }
        await this.host.getIpcManager().request(MessageType.REQUEST, {
            action: 'submit_task',
            task
        });
    }
    async cancelTask(taskId) {
        const tm = this.getTaskManager();
        if (tm) {
            await tm.cancelTask(taskId);
            return;
        }
        await this.host.getIpcManager().request(MessageType.REQUEST, {
            action: 'cancel_task',
            taskId
        });
    }
    onTaskCompleted(taskId, callback) {
        const tm = this.getTaskManager();
        if (tm) {
            tm.onTaskCompleted(taskId, (res) => callback(res.result !== undefined ? res.result : res));
            return;
        }
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
    getRegistry() {
        const tm = this.host.taskManager;
        return tm ? tm.getCapabilityRegistry() : null;
    }
    async advertiseCapabilities(caps) {
        const reg = this.getRegistry();
        if (reg) {
            const nodeId = this.host.nodeId;
            if (nodeId) {
                reg.registerCapabilities({
                    nodeId,
                    capabilities: caps,
                    updatedAt: Date.now()
                });
            }
        }
        try {
            await this.host.getIpcManager().request(MessageType.REQUEST, {
                action: 'advertise_capabilities',
                capabilities: caps
            });
        }
        catch { }
    }
    async getRemoteCapabilities(nodeId) {
        const reg = this.getRegistry();
        if (reg) {
            const caps = reg.getCapabilities(nodeId);
            if (caps)
                return caps.capabilities;
        }
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