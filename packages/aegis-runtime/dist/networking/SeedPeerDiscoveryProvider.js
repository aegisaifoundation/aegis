import { PeerConnectionState } from '@aegis/sdk';
export class SeedPeerDiscoveryProvider {
    seedPeers;
    name = 'SeedPeerDiscoveryProvider';
    callbacks = new Set();
    constructor(seedPeers) {
        this.seedPeers = seedPeers;
    }
    onPeerDiscovered(callback) {
        this.callbacks.add(callback);
    }
    async start() {
        for (const seed of this.seedPeers) {
            if (seed.nodeId) {
                const descriptor = {
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
    async stop() { }
}
