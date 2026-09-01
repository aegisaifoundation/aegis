export class NetworkConfigurationManager {
    config = {
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
    constructor(customConfig) {
        if (customConfig) {
            this.config = { ...this.config, ...customConfig };
        }
    }
    get() {
        return { ...this.config };
    }
    update(partial) {
        this.config = { ...this.config, ...partial };
    }
    setBoundMsgPort(port) {
        this.config.msgPort = port;
    }
    setBoundNativeTcpPort(port) {
        this.config.nativeTcpPort = port;
    }
}
