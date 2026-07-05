import { EventBus, ConfigurationManager } from '@aegis/runtime';
import { ToolRegistry } from '@aegis/tools';
import { ProviderManager } from '@aegis/providers';

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
    getCommandRegistry(): any;
    getModelProvider(): ProviderManager;
    getWorkspacePath(): string;
    getPluginRegistry(): any;
    getLogger(): Logger;
  };
  config: any;
}
