import { IDiscoveryProvider, IPeerDescriptor } from '@aegis/sdk';
export declare class LanDiscoveryProvider implements IDiscoveryProvider {
    private localNodeId;
    private localNodeName;
    private getEndpoints;
    private udpPort;
    readonly name = "LanDiscoveryProvider";
    private socket;
    private timer;
    private callbacks;
    private isRunning;
    constructor(localNodeId: string, localNodeName: string, getEndpoints: () => {
        transport: string;
        port: number;
        priority?: number;
    }[], udpPort?: number);
    onPeerDiscovered(callback: (peer: IPeerDescriptor) => void): void;
    start(): Promise<void>;
    private broadcastAnnounce;
    stop(): Promise<void>;
}
