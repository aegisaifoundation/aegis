export interface EngineConfig {
  nodeId?: string;
  nodeName: string;
  port: number;
  host: string;
  allowDiscovery: boolean;
  binaryPath?: string;
  startupTimeoutMs?: number;
  heartbeatIntervalMs?: number;
  maxRestarts?: number;
}

export const DEFAULT_CONFIG: EngineConfig = {
  nodeName: 'aegis-die-node',
  port: 9900,
  host: '0.0.0.0',
  allowDiscovery: true,
  startupTimeoutMs: 15000,
  heartbeatIntervalMs: 10000,
  maxRestarts: 3
};
