export interface INetworkConfig {
    nativeTcpPort: number;
    msgPort: number;
    discoveryPort: number;
    bindHost: string;
    handshakeTimeoutMs: number;
    reconnectInitialDelayMs: number;
    reconnectMaxDelayMs: number;
    reconnectBackoffFactor: number;
    allowLoopback: boolean;
    seedPeers: string[];
}
export declare class NetworkConfigurationManager {
    private config;
    constructor(customConfig?: Partial<INetworkConfig>);
    get(): INetworkConfig;
    update(partial: Partial<INetworkConfig>): void;
    setBoundMsgPort(port: number): void;
    setBoundNativeTcpPort(port: number): void;
}
