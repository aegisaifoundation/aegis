export interface ToolContext {
  workspacePath: string;
  sessionId: string;
  permissions?: Record<string, boolean>;
  runtimeMetadata?: Record<string, any>;
  activeAgentId?: string;
  runtimeConfig?: Record<string, any>;
}

export interface Tool {
  name: string;
  description: string;
  version: string;
  permissions?: Record<string, boolean>;
  execute(input: string, context: ToolContext): Promise<string>;
}

