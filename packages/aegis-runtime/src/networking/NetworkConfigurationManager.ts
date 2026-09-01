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

export class NetworkConfigurationManager {
  private config: INetworkConfig = {
    nativeTcpPort: 9900,
    msgPort: 9901,
    discoveryPort: 9888,
    bindHost: '0.0.0.0',
    handshakeTimeoutMs: 5000,
    reconnectInitialDelayMs: 1000,
    reconnectMaxDelayMs: 30000,
    reconnectBackoffFactor: 1.5,
    allowLoopback: process.env.NODE_ENV === 'test' || process.env.AEGIS_ALLOW_LOOPBACK === 'true',
    seedPeers: []
  };

  constructor(customConfig?: Partial<INetworkConfig>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
  }

  get(): INetworkConfig {
    return { ...this.config };
  }

  update(partial: Partial<INetworkConfig>): void {
    this.config = { ...this.config, ...partial };
  }

  setBoundMsgPort(port: number): void {
    this.config.msgPort = port;
  }

  setBoundNativeTcpPort(port: number): void {
    this.config.nativeTcpPort = port;
  }
}
