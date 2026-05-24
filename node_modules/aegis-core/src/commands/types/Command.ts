import type { CommandContext } from './CommandContext.js';

export interface CommandResult {
  success: boolean;
  message?: string;
  output?: any;
}

export interface Command {
  name: string;
  description: string;
  category?: string;
  version?: string;
  permissions?: string[];
  commandPath?: string;
  execute(input: string, context: CommandContext): Promise<CommandResult>;
}

export enum CommandState {
  DISCOVERED = 'DISCOVERED',
  INITIALIZING = 'INITIALIZING',
  LOADED = 'LOADED',
  REGISTERED = 'REGISTERED',
  FAILED = 'FAILED',
  DISABLED = 'DISABLED'
}
