import dgram from 'dgram';
import { PeerConnectionState } from '@aegis/sdk';
export class LanDiscoveryProvider {
    localNodeId;
    localNodeName;
    getEndpoints;
    udpPort;
    name = 'LanDiscoveryProvider';
    socket = null;
    timer = null;
    callbacks = new Set();
    isRunning = false;
    constructor(localNodeId, localNodeName, getEndpoints, udpPort = 9888) {
        this.localNodeId = localNodeId;
        this.localNodeName = localNodeName;
        this.getEndpoints = getEndpoints;
        this.udpPort = udpPort;
    }
    onPeerDiscovered(callback) {
        this.callbacks.add(callback);
    }
    async start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        try {
            this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
            this.socket.on('message', (msg, rinfo) => {
                try {
                    const payload = JSON.parse(msg.toString('utf8'));
                    if (payload.type === 'ANNOUNCE' && payload.nodeId && payload.nodeId !== this.localNodeId) {
                        // Extract remote sender IP address from UDP packet rinfo.address
                        const remoteIp = rinfo.address;
                        const advertisedEndpoints = Array.isArray(payload.endpoints) ? payload.endpoints : [];
                        const resolvedEndpoints = advertisedEndpoints.map((ep, idx) => ({
                            transport: ep.transport || 'tcp',
                            host: remoteIp,
                            port: ep.port,
                            priority: ep.priority ?? (idx + 1)
                        }));
                        const descriptor = {
                            nodeId: payload.nodeId,
                            nodeName: payload.nodeName || 'remote-node',
                            endpoints: resolvedEndpoints,
                            connectionState: PeerConnectionState.DISCOVERED,
                            lastSeen: Date.now()
                        };
                        console.log(`[AEGIS Discovery] Peer discovered: ${descriptor.nodeId} at ${remoteIp} (${resolvedEndpoints.length} endpoint(s))`);
                        for (const cb of this.callbacks) {
                            cb(descriptor);
                        }
                    }
                }
                catch { }
            });
            this.socket.on('error', (err) => {
                console.warn(`[AEGIS Discovery] UDP socket error: ${err.message}`);
            });
            this.socket.bind(this.udpPort, () => {
                try {
                    this.socket?.setBroadcast(true);
                }
                catch { }
                console.log(`[AEGIS Discovery] LAN Discovery Provider bound to UDP port ${this.udpPort}`);
            });
            // Start periodic ANNOUNCE broadcast
            this.timer = setInterval(() => this.broadcastAnnounce(), 3000);
            // Send initial announcement immediately
            this.broadcastAnnounce();
        }
        catch (err) {
            console.warn(`[AEGIS Discovery] Failed to start LAN Discovery Provider: ${err.message}`);
        }
    }
    broadcastAnnounce() {
        if (!this.socket || !this.isRunning)
            return;
        try {
            const packet = JSON.stringify({
                type: 'ANNOUNCE',
                nodeId: this.localNodeId,
                nodeName: this.localNodeName,
                endpoints: this.getEndpoints()
            });
            const buf = Buffer.from(packet, 'utf8');
            this.socket.send(buf, 0, buf.length, this.udpPort, '255.255.255.255');
        }
        catch { }
    }
    async stop() {
        this.isRunning = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        if (this.socket) {
            try {
                this.socket.close();
            }
            catch { }
            this.socket = null;
        }
        console.log('[AEGIS Discovery] LAN Discovery Provider stopped.');
    }
}
