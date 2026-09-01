import dgram from 'dgram';
import { IDiscoveryProvider, IPeerDescriptor, PeerConnectionState } from '@aegis/sdk';

export class LanDiscoveryProvider implements IDiscoveryProvider {
  readonly name = 'LanDiscoveryProvider';
  private socket: dgram.Socket | null = null;
  private timer: NodeJS.Timeout | null = null;
  private callbacks = new Set<(peer: IPeerDescriptor) => void>();
  private isRunning = false;

  constructor(
    private localNodeId: string,
    private localNodeName: string,
    private getEndpoints: () => { transport: string; port: number; priority?: number }[],
    private udpPort = 9888
  ) {}

  onPeerDiscovered(callback: (peer: IPeerDescriptor) => void): void {
    this.callbacks.add(callback);
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
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
            
            const resolvedEndpoints = advertisedEndpoints.map((ep: any, idx: number) => ({
              transport: ep.transport || 'tcp',
              host: remoteIp,
              port: ep.port,
              priority: ep.priority ?? (idx + 1)
            }));

            const descriptor: IPeerDescriptor = {
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
        } catch {}
      });

      this.socket.on('error', (err) => {
        console.warn(`[AEGIS Discovery] UDP socket error: ${err.message}`);
      });

      this.socket.bind(this.udpPort, () => {
        try {
          this.socket?.setBroadcast(true);
        } catch {}
        console.log(`[AEGIS Discovery] LAN Discovery Provider bound to UDP port ${this.udpPort}`);
      });

      // Start periodic ANNOUNCE broadcast
      this.timer = setInterval(() => this.broadcastAnnounce(), 3000);
      // Send initial announcement immediately
      this.broadcastAnnounce();
    } catch (err: any) {
      console.warn(`[AEGIS Discovery] Failed to start LAN Discovery Provider: ${err.message}`);
    }
  }

  private broadcastAnnounce(): void {
    if (!this.socket || !this.isRunning) return;
    try {
      const packet = JSON.stringify({
        type: 'ANNOUNCE',
        nodeId: this.localNodeId,
        nodeName: this.localNodeName,
        endpoints: this.getEndpoints()
      });
      const buf = Buffer.from(packet, 'utf8');
      this.socket.send(buf, 0, buf.length, this.udpPort, '255.255.255.255');
    } catch {}
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.socket) {
      try {
        this.socket.close();
      } catch {}
      this.socket = null;
    }
    console.log('[AEGIS Discovery] LAN Discovery Provider stopped.');
  }
}
