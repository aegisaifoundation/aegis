import { AEGIS_NET_PROTOCOL_VERSION, PeerConnectionState } from '@aegis/sdk';
export class ConnectionManager {
    localNodeId;
    localNodeName;
    peerRegistry;
    configManager;
    transports;
    activeConnections = new Map();
    reconnectBackoffs = new Map(); // nodeId -> attempt count
    reconnectTimers = new Map();
    messageListeners = new Map();
    messageRouter = null;
    setMessageRouter(router) {
        this.messageRouter = router;
    }
    constructor(localNodeId, localNodeName, peerRegistry, configManager, transports) {
        this.localNodeId = localNodeId;
        this.localNodeName = localNodeName;
        this.peerRegistry = peerRegistry;
        this.configManager = configManager;
        this.transports = transports;
        for (const transport of this.transports) {
            transport.onConnection((socket, remoteAddr) => this.handleIncomingTransportConnection(socket, remoteAddr, transport));
            transport.onMessage((socket, payload) => this.handleTransportMessage(socket, payload));
            transport.onDisconnect((socket) => this.handleTransportDisconnect(socket));
        }
    }
    async connectToPeer(targetNodeId) {
        const config = this.configManager.get();
        // Check if already active
        const existing = this.activeConnections.get(targetNodeId);
        if (existing && existing.state === PeerConnectionState.ACTIVE) {
            return existing;
        }
        const supportedTransports = this.transports.map(t => t.transportType);
        const resolved = this.peerRegistry.resolveEndpoint(targetNodeId, supportedTransports);
        if (!resolved) {
            console.warn(`[AEGIS Connection] FAILED Target=${targetNodeId} Stage=ENDPOINT_RESOLUTION Error=No compatible reachable endpoint found in PeerRegistry`);
            throw new Error(`[ConnectionManager] Could not resolve endpoint for ${targetNodeId}`);
        }
        const { endpoint, reason } = resolved;
        const adapter = this.transports.find(t => t.transportType === endpoint.transport) || this.transports[0];
        console.log(`[AEGIS Connection] Target=${targetNodeId} SelectedTransport=${adapter.transportType} Endpoint=${endpoint.host}:${endpoint.port} Reason="${reason}"`);
        this.peerRegistry.updateConnectionState(targetNodeId, PeerConnectionState.CONNECTING);
        try {
            const socket = await adapter.connect(endpoint.host, endpoint.port);
            console.log(`[AEGIS Transport] Socket connected to ${endpoint.host}:${endpoint.port}`);
            this.peerRegistry.updateConnectionState(targetNodeId, PeerConnectionState.TRANSPORT_CONNECTED);
            const conn = {
                nodeId: targetNodeId,
                socket,
                transport: adapter,
                state: PeerConnectionState.HANDSHAKING,
                remoteAddr: `${endpoint.host}:${endpoint.port}`,
                isOutbound: true
            };
            this.activeConnections.set(targetNodeId, conn);
            // Set Handshake Timeout (5s)
            conn.handshakeTimeout = setTimeout(() => {
                if (conn.state === PeerConnectionState.HANDSHAKING) {
                    console.error(`[AEGIS Failure] Target=${targetNodeId} Endpoint=${conn.remoteAddr} Stage=HANDSHAKE Error=Handshake timeout (${config.handshakeTimeoutMs}ms)`);
                    this.closeConnection(conn, 'Handshake timeout');
                }
            }, config.handshakeTimeoutMs);
            // Send HELLO packet
            const helloFrame = JSON.stringify({
                type: 'HELLO',
                nodeId: this.localNodeId,
                nodeName: this.localNodeName,
                protocolVersion: AEGIS_NET_PROTOCOL_VERSION
            });
            await adapter.send(socket, helloFrame);
            console.log(`[AEGIS Handshake] Sent HELLO frame to ${targetNodeId} (${conn.remoteAddr})`);
            return conn;
        }
        catch (err) {
            console.error(`[AEGIS Connection] FAILED Target=${targetNodeId} Endpoint=${endpoint.host}:${endpoint.port} Error=${err.message}`);
            this.peerRegistry.updateConnectionState(targetNodeId, PeerConnectionState.DISCONNECTED);
            this.scheduleReconnection(targetNodeId);
            throw err;
        }
    }
    async handleIncomingTransportConnection(socket, remoteAddr, transport) {
        console.log(`[AEGIS Transport] Incoming connection accepted from ${remoteAddr}`);
    }
    async handleTransportMessage(socket, payloadStr) {
        let packet;
        try {
            packet = JSON.parse(payloadStr);
        }
        catch {
            return;
        }
        const type = packet.type || packet.messageType;
        // 1. Handshake HELLO packet (Inbound Connection)
        if (type === 'HELLO') {
            await this.handleIncomingHello(socket, packet);
            return;
        }
        // 2. Handshake HELLO_ACK packet (Outbound Connection Response)
        if (type === 'HELLO_ACK') {
            await this.handleIncomingHelloAck(socket, packet);
            return;
        }
        // 3. Handshake HELLO_FAIL packet
        if (type === 'HELLO_FAIL') {
            console.error(`[AEGIS Handshake] Received HELLO_FAIL: ${packet.reason}`);
            this.findAndCloseSocket(socket, packet.reason);
            return;
        }
        // 4. Application Payload Packet — Only process if connection is VERIFIED/ACTIVE
        const senderId = packet.senderId || packet.senderNodeId;
        if (senderId && (packet.payload !== undefined || packet.messageId !== undefined)) {
            const activeConn = this.findConnectionBySocket(socket);
            if (!activeConn || (activeConn.state !== PeerConnectionState.VERIFIED && activeConn.state !== PeerConnectionState.ACTIVE)) {
                console.warn(`[AEGIS Messaging] Rejected payload frame on unverified connection from ${senderId}`);
                return;
            }
            let userPayload = packet.payload !== undefined ? packet.payload : packet;
            if (userPayload && typeof userPayload === 'object' && userPayload.protocolVersion && userPayload.payload !== undefined) {
                userPayload = userPayload.payload;
            }
            console.log(`[AEGIS Messaging] Delivered packet messageType=${packet.messageType} from ${senderId}`);
            this.deliverPayload(packet.messageType, userPayload, senderId);
            // Also forward to AegisMessageRouter if attached
            if (this.messageRouter) {
                Promise.resolve(this.messageRouter.handleIngressMessage(packet, socket)).catch(err => {
                    console.error('[AEGIS Messaging] Ingress message router error:', err);
                });
            }
        }
    }
    async handleIncomingHello(socket, packet) {
        const remoteNodeId = packet.nodeId;
        const remoteProtocolVersion = packet.protocolVersion;
        const config = this.configManager.get();
        // Validation Check 1: Valid nodeId format
        if (!remoteNodeId || !remoteNodeId.startsWith('aegis://')) {
            console.error(`[AEGIS Handshake] Rejected HELLO: Invalid nodeId format "${remoteNodeId}"`);
            await this.sendHelloFail(socket, 'Invalid nodeId format');
            return;
        }
        // Validation Check 2: Reject self-connection
        if (remoteNodeId === this.localNodeId) {
            console.warn(`[AEGIS Handshake] Rejected self-connection attempt from ${remoteNodeId}`);
            await this.sendHelloFail(socket, 'Self connection rejected');
            return;
        }
        // Validation Check 3: Protocol version compatibility
        if (remoteProtocolVersion !== AEGIS_NET_PROTOCOL_VERSION) {
            console.error(`[AEGIS Handshake] Rejected HELLO: Protocol version mismatch (Local: ${AEGIS_NET_PROTOCOL_VERSION}, Remote: ${remoteProtocolVersion})`);
            await this.sendHelloFail(socket, 'Protocol version mismatch');
            return;
        }
        console.log(`[AEGIS Handshake] Inbound identity validated for ${remoteNodeId} (${packet.nodeName || 'unknown'})`);
        // Complete validation — send HELLO_ACK
        const ackFrame = JSON.stringify({
            type: 'HELLO_ACK',
            nodeId: this.localNodeId,
            nodeName: this.localNodeName,
            protocolVersion: AEGIS_NET_PROTOCOL_VERSION,
            status: 'VERIFIED'
        });
        const adapter = this.transports[0];
        await adapter.send(socket, ackFrame);
        // Register inbound connection
        const conn = {
            nodeId: remoteNodeId,
            socket,
            transport: adapter,
            state: PeerConnectionState.VERIFIED,
            remoteAddr: 'inbound',
            isOutbound: false
        };
        this.promoteConnectionToActive(conn);
    }
    async handleIncomingHelloAck(socket, packet) {
        const remoteNodeId = packet.nodeId;
        // Find pending outbound connection
        let pendingConn;
        for (const c of this.activeConnections.values()) {
            if (c.socket === socket || (c.isOutbound && c.nodeId === remoteNodeId)) {
                pendingConn = c;
                break;
            }
        }
        if (!pendingConn) {
            console.warn(`[AEGIS Handshake] Received unexpected HELLO_ACK from ${remoteNodeId}`);
            return;
        }
        // Clear handshake timeout
        if (pendingConn.handshakeTimeout) {
            clearTimeout(pendingConn.handshakeTimeout);
            pendingConn.handshakeTimeout = undefined;
        }
        // Mutual Identity Validation: Verify returned HELLO_ACK.nodeId matches expected targetNodeId
        if (remoteNodeId !== pendingConn.nodeId) {
            console.error(`[AEGIS Handshake] Identity Mismatch! Expected: ${pendingConn.nodeId}, Received: ${remoteNodeId}`);
            await this.sendHelloFail(socket, 'Identity mismatch');
            this.closeConnection(pendingConn, 'Identity mismatch');
            return;
        }
        console.log(`[AEGIS Handshake] Identity mutually verified for ${remoteNodeId} (protocol v${packet.protocolVersion})`);
        pendingConn.state = PeerConnectionState.VERIFIED;
        this.promoteConnectionToActive(pendingConn);
    }
    promoteConnectionToActive(conn) {
        // Deterministic Duplicate Connection Arbitration:
        // If Node A and Node B connect simultaneously, compare nodeId lexicographically
        const existing = this.activeConnections.get(conn.nodeId);
        if (existing && existing !== conn && existing.state === PeerConnectionState.ACTIVE) {
            console.log(`[AEGIS Connection] Duplicate connection detected for ${conn.nodeId}. Arbitrating based on canonical nodeId...`);
            if (this.localNodeId < conn.nodeId) {
                // Our outbound connection wins; close the incoming competing duplicate
                console.log(`[AEGIS Connection] Local nodeId (${this.localNodeId}) < Remote nodeId (${conn.nodeId}). Preserving primary connection, closing duplicate.`);
                this.closeConnection(conn, 'Duplicate connection arbitration');
                return;
            }
            else {
                // Remote connection wins; close our existing duplicate
                console.log(`[AEGIS Connection] Local nodeId (${this.localNodeId}) > Remote nodeId (${conn.nodeId}). Replacing existing connection with winner.`);
                this.closeConnection(existing, 'Duplicate connection replaced');
            }
        }
        conn.state = PeerConnectionState.ACTIVE;
        this.activeConnections.set(conn.nodeId, conn);
        this.peerRegistry.updateConnectionState(conn.nodeId, PeerConnectionState.ACTIVE);
        this.reconnectBackoffs.delete(conn.nodeId); // Reset backoff counter on active success
        console.log(`[AEGIS Connection] Peer ${conn.nodeId} promoted to ACTIVE logical connection.`);
    }
    async sendHelloFail(socket, reason) {
        try {
            const failFrame = JSON.stringify({ type: 'HELLO_FAIL', reason });
            const adapter = this.transports[0];
            await adapter.send(socket, failFrame);
            adapter.disconnect(socket);
        }
        catch { }
    }
    handleTransportDisconnect(socket) {
        const conn = this.findConnectionBySocket(socket);
        if (conn) {
            console.warn(`[AEGIS Connection] Transport disconnected for ${conn.nodeId} (${conn.remoteAddr})`);
            this.closeConnection(conn, 'Transport disconnected');
            this.scheduleReconnection(conn.nodeId);
        }
    }
    scheduleReconnection(nodeId) {
        if (!this.peerRegistry.getPeer(nodeId))
            return; // Peer removed
        if (this.reconnectTimers.has(nodeId))
            return; // Already scheduled
        const config = this.configManager.get();
        const attempts = (this.reconnectBackoffs.get(nodeId) || 0) + 1;
        this.reconnectBackoffs.set(nodeId, attempts);
        const delay = Math.min(config.reconnectInitialDelayMs * Math.pow(config.reconnectBackoffFactor, attempts - 1), config.reconnectMaxDelayMs);
        console.log(`[AEGIS Connection] Scheduling reconnect for ${nodeId} in ${Math.round(delay)}ms (attempt ${attempts})`);
        const timer = setTimeout(async () => {
            this.reconnectTimers.delete(nodeId);
            try {
                await this.connectToPeer(nodeId);
            }
            catch { }
        }, delay);
        this.reconnectTimers.set(nodeId, timer);
    }
    async sendPeerMessage(targetNodeId, messageType, payload) {
        let conn = this.activeConnections.get(targetNodeId);
        if (!conn || conn.state !== PeerConnectionState.ACTIVE) {
            console.log(`[AEGIS Connection] Target ${targetNodeId} not ACTIVE. Initiating connection & handshake...`);
            conn = await this.connectToPeer(targetNodeId);
        }
        const envelope = JSON.stringify({
            messageType,
            senderId: this.localNodeId,
            payload
        });
        await conn.transport.send(conn.socket, envelope);
        console.log(`[AEGIS Messaging] Sent packet messageType=${messageType} to ${targetNodeId}`);
    }
    onMessage(messageType, callback) {
        if (!this.messageListeners.has(messageType)) {
            this.messageListeners.set(messageType, new Set());
        }
        this.messageListeners.get(messageType).add(callback);
    }
    deliverPayload(messageType, payload, senderId) {
        const callbacks = this.messageListeners.get(messageType);
        if (callbacks) {
            for (const cb of callbacks) {
                Promise.resolve(cb(payload, senderId)).catch(err => {
                    console.error(`Error in message callback for ${messageType}:`, err);
                });
            }
        }
    }
    findConnectionBySocket(socket) {
        for (const c of this.activeConnections.values()) {
            if (c.socket === socket)
                return c;
        }
        return undefined;
    }
    findAndCloseSocket(socket, reason) {
        const conn = this.findConnectionBySocket(socket);
        if (conn) {
            this.closeConnection(conn, reason);
        }
        else {
            try {
                socket.destroy();
            }
            catch { }
        }
    }
    closeConnection(conn, reason) {
        if (conn.handshakeTimeout) {
            clearTimeout(conn.handshakeTimeout);
            conn.handshakeTimeout = undefined;
        }
        conn.state = PeerConnectionState.DISCONNECTED;
        this.activeConnections.delete(conn.nodeId);
        this.peerRegistry.updateConnectionState(conn.nodeId, PeerConnectionState.DISCONNECTED);
        try {
            conn.transport.disconnect(conn.socket);
        }
        catch { }
        console.log(`[AEGIS Connection] Closed connection for ${conn.nodeId}. Reason: ${reason}`);
    }
    async stop() {
        for (const timer of this.reconnectTimers.values()) {
            clearTimeout(timer);
        }
        this.reconnectTimers.clear();
        for (const conn of Array.from(this.activeConnections.values())) {
            this.closeConnection(conn, 'Shutdown');
        }
        this.activeConnections.clear();
    }
}
