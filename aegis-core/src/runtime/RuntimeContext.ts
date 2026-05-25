import { EventBus } from '../events/EventBus.js';
import { ProviderManager } from '../providers/ProviderManager.js';

export interface Logger {
  info(message: string, context?: any): void;
  debug(message: string, context?: any): void;
  warn(message: string, context?: any): void;
  error(message: string, context?: any): void;
}

export interface RuntimeContext {
  eventBus: EventBus;
  providerManager: ProviderManager;
  logger: Logger;
  config: any;
  workspacePath: string;
}
