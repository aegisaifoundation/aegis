import { IPeerDescriptor, IPeerEndpoint, PeerConnectionState } from '@aegis/sdk';

export class PeerRegistry {
  private peers = new Map<string, IPeerDescriptor>();

  constructor(private allowLoopback = false) {}

  setAllowLoopback(allow: boolean): void {
    this.allowLoopback = allow;
  }

  registerPeer(descriptor: IPeerDescriptor): boolean {
    if (!descriptor.nodeId || !descriptor.nodeId.startsWith('aegis://')) {
      console.warn(`[AEGIS Registry] Rejected registration for invalid nodeId: ${descriptor.nodeId}`);
      return false;
    }

    // Filter endpoints for production loopback restriction
    const validEndpoints = descriptor.endpoints.filter(ep => {
      return this.isValidEndpointHost(ep.host);
    });

    if (validEndpoints.length === 0 && descriptor.endpoints.length > 0) {
      console.warn(`[AEGIS Registry] All endpoints rejected for ${descriptor.nodeId} due to loopback/invalid host restrictions.`);
      return false;
    }

    const existing = this.peers.get(descriptor.nodeId);
    if (existing) {
      // Update endpoints and metadata without changing identity
      existing.nodeName = descriptor.nodeName || existing.nodeName;
      existing.endpoints = validEndpoints;
      existing.lastSeen = Date.now();
      if (descriptor.capabilities) existing.capabilities = descriptor.capabilities;
      if (descriptor.metadata) existing.metadata = { ...existing.metadata, ...descriptor.metadata };
      console.log(`[AEGIS Registry] Updated peer ${descriptor.nodeId} in PeerRegistry (${validEndpoints.length} endpoint(s)).`);
      return true;
    }

    const newDescriptor: IPeerDescriptor = {
      nodeId: descriptor.nodeId,
      nodeName: descriptor.nodeName || 'aegis-node',
      endpoints: validEndpoints,
      capabilities: descriptor.capabilities || [],
      connectionState: descriptor.connectionState || PeerConnectionState.DISCOVERED,
      lastSeen: Date.now(),
      metadata: descriptor.metadata || {}
    };

    this.peers.set(descriptor.nodeId, newDescriptor);
    console.log(`[AEGIS Registry] Registered peer ${descriptor.nodeId} in PeerRegistry`);
    return true;
  }

  getPeer(nodeId: string): IPeerDescriptor | undefined {
    return this.peers.get(nodeId);
  }

  updateConnectionState(nodeId: string, state: PeerConnectionState): void {
    const peer = this.peers.get(nodeId);
    if (peer) {
      peer.connectionState = state;
      peer.lastSeen = Date.now();
    }
  }

  resolveEndpoint(nodeId: string, supportedTransports: string[]): { endpoint: IPeerEndpoint; reason: string } | undefined {
    const peer = this.peers.get(nodeId);
    if (!peer || peer.endpoints.length === 0) {
      return undefined;
    }

    // Filter endpoints matching supported transports
    const compatible = peer.endpoints.filter(ep => supportedTransports.includes(ep.transport));
    if (compatible.length === 0) {
      return undefined;
    }

    // Sort by priority ascending (lower numeric value = higher preference)
    compatible.sort((a, b) => (a.priority ?? 10) - (b.priority ?? 10));
    const selected = compatible[0];
    const reason = `Highest-priority mutually compatible endpoint (${selected.transport}:${selected.host}:${selected.port})`;

    return { endpoint: selected, reason };
  }

  removePeer(nodeId: string): void {
    this.peers.delete(nodeId);
    console.log(`[AEGIS Registry] Removed peer ${nodeId} from PeerRegistry`);
  }

  listPeers(): IPeerDescriptor[] {
    return Array.from(this.peers.values());
  }

  private isValidEndpointHost(host: string): boolean {
    if (this.allowLoopback) return true;
    const normalized = host.trim().toLowerCase();
    if (normalized === '0.0.0.0' || normalized === '127.0.0.1' || normalized === '::1' || normalized === 'localhost') {
      return false;
    }
    return true;
  }
}
