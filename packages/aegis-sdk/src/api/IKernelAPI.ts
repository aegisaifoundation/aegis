import { EventEnvelope } from '../types/Events.js';

export type KernelStatus = 'INITIALIZING' | 'ACTIVE' | 'DEGRADED' | 'SHUTTING_DOWN' | 'SAFE_MODE';

export interface ScheduledTask {
  id: string;
  name: string;
  expression: string; // Cron expression
  payload: any;
}

export interface IKernelAPI_v1 {
  readonly version: string;
  readonly status: KernelStatus;
  
  resolve<T>(serviceName: string): T;
  publishEvent(envelope: EventEnvelope): void;
  scheduleTask(task: ScheduledTask): string;
  shutdown(): Promise<void>;
}
