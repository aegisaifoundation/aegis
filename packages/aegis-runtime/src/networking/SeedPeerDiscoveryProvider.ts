import { IDiscoveryProvider, IPeerDescriptor, PeerConnectionState } from '@aegis/sdk';

export class SeedPeerDiscoveryProvider implements IDiscoveryProvider {
  readonly name = 'SeedPeerDiscoveryProvider';
  private callbacks = new Set<(peer: IPeerDescriptor) => void>();

  constructor(private seedPeers: { nodeId?: string; host: string; port: number; transport?: string }[]) {}

  onPeerDiscovered(callback: (peer: IPeerDescriptor) => void): void {
    this.callbacks.add(callback);
  }

  async start(): Promise<void> {
    for (const seed of this.seedPeers) {
      if (seed.nodeId) {
        const descriptor: IPeerDescriptor = {
          nodeId: seed.nodeId,
          endpoints: [
            {
              transport: seed.transport || 'tcp',
              host: seed.host,
              port: seed.port,
              priority: 1
            }
          ],
          connectionState: PeerConnectionState.DISCOVERED,
          lastSeen: Date.now()
        };
        for (const cb of this.callbacks) {
          cb(descriptor);
        }
      }
    }
  }

  async stop(): Promise<void> {}
}
