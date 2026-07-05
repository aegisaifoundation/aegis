export interface ToolContext {
  workspacePath: string;
  sessionId: string;
  permissions?: Record<string, boolean>;
  runtimeMetadata?: Record<string, any>;
  activeAgentId?: string;
  runtimeConfig?: Record<string, any>;
  memoryRegistry?: any;
  eventBus?: any;
}

export interface Tool {
  name: string;
  description: string;
  version: string;
  permissions?: Record<string, boolean>;
  toolPath?: string;
  execute(input: string, context: ToolContext): Promise<string>;
}

export enum ToolState {
  DISCOVERED = 'DISCOVERED',
  LOADED = 'LOADED',
  REGISTERED = 'REGISTERED',
  FAILED = 'FAILED',
  DISABLED = 'DISABLED'
}
