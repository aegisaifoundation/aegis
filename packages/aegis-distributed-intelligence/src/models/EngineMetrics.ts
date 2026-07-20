export interface EngineMetrics {
  uptimeMs: number;
  messagesTransmitted: number;
  bytesTransmitted: number;
  lastLatencyMs: number;
  avgLatencyMs: number;
  pid?: number;
  cpuUsage?: number;
  memoryUsageBytes?: number;
}
