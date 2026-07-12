export interface EngineConfig {
    nodeName: string;
    port: number;
    host: string;
    allowDiscovery: boolean;
    binaryPath?: string;
    startupTimeoutMs?: number;
    heartbeatIntervalMs?: number;
    maxRestarts?: number;
}
export declare const DEFAULT_CONFIG: EngineConfig;
//# sourceMappingURL=ConfigurationSchema.d.ts.map