import { IDiscoveryProvider, IPeerDescriptor } from '@aegis/sdk';
export declare class SeedPeerDiscoveryProvider implements IDiscoveryProvider {
    private seedPeers;
    readonly name = "SeedPeerDiscoveryProvider";
    private callbacks;
    constructor(seedPeers: {
        nodeId?: string;
        host: string;
        port: number;
        transport?: string;
    }[]);
    onPeerDiscovered(callback: (peer: IPeerDescriptor) => void): void;
    start(): Promise<void>;
    stop(): Promise<void>;
}
