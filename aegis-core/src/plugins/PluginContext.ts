import { EventBus } from '../runtime/EventBus.js';
import { ConfigurationManager } from '../config/ConfigurationManager.js';
import { ToolRegistry } from '../tools/ToolRegistry.js';
import { CommandRegistry } from '../commands/CommandRegistry.js';
import { ModelHandler } from '../models/index.js';

export interface Logger {
  info(message: string, context?: any): void;
  debug(message: string, context?: any): void;
  warn(message: string, context?: any): void;
  error(message: string, context?: any): void;
}

export interface PluginContext {
  services: {
    getEventBus(): EventBus;
    getConfigurationManager(): ConfigurationManager;
    getToolRegistry(): ToolRegistry;
    getCommandRegistry(): CommandRegistry;
    getModelProvider(): ModelHandler;
    getWorkspacePath(): string;
    getPluginRegistry(): any;
    getLogger(): Logger;
  };
  config: any;
}
