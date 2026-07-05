export interface Message {
  id?: string;
  role: 'user' | 'assistant' | 'system' | 'tool' | 'workflow' | 'event' | 'runtime' | 'observation';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface Logger {
  info(message: string, context?: any): void;
  debug(message: string, context?: any): void;
  warn(message: string, context?: any): void;
  error(message: string, context?: any): void;
}

export interface RuntimeContext {
  eventBus: any;
  providerManager: any;
  logger: Logger;
  config: any;
  workspacePath: string;
  memoryRegistry: any;
}
