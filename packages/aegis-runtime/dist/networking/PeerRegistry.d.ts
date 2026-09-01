import { IPeerDescriptor, IPeerEndpoint, PeerConnectionState } from '@aegis/sdk';
export declare class PeerRegistry {
    private allowLoopback;
    private peers;
    constructor(allowLoopback?: boolean);
    setAllowLoopback(allow: boolean): void;
    registerPeer(descriptor: IPeerDescriptor): boolean;
    getPeer(nodeId: string): IPeerDescriptor | undefined;
    updateConnectionState(nodeId: string, state: PeerConnectionState): void;
    resolveEndpoint(nodeId: string, supportedTransports: string[]): {
        endpoint: IPeerEndpoint;
        reason: string;
    } | undefined;
    removePeer(nodeId: string): void;
    listPeers(): IPeerDescriptor[];
    private isValidEndpointHost;
}
