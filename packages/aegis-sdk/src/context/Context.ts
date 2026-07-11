import { ILogger } from '../logging/ILogger.js';
import { IEventBus } from '../types/Events.js';
import { IKernelAPI_v1 } from '../api/IKernelAPI.js';

export interface IRuntimeContext_v1 {
  readonly runtimeId: string;
  readonly kernelVersion: string;
  readonly bootId: string;
  readonly platform: string;
  readonly architecture: string;
  readonly bootMode: 'NORMAL' | 'SAFE_MODE' | 'RECOVERY_MODE';
  
  getWorkspacePath(): string;
  getLogger(): ILogger;
  getConfig(): Record<string, any>;
  getSecrets(): Record<string, string>;
  getService<T>(tokenName: string): T;
  getEventBus(): IEventBus;
}
