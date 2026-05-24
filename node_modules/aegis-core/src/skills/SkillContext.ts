import { EventBus } from '../runtime/EventBus.js';
import { ConfigurationManager } from '../config/ConfigurationManager.js';
import { ToolRegistry } from '../tools/ToolRegistry.js';
import { CommandRegistry } from '../commands/CommandRegistry.js';
import { ProviderManager } from '../providers/index.js';

export interface Logger {
  info(message: string, context?: any): void;
  debug(message: string, context?: any): void;
  warn(message: string, context?: any): void;
  error(message: string, context?: any): void;
}

export interface SkillContext {
  services: {
    getEventBus(): EventBus;
    getConfigurationManager(): ConfigurationManager;
    getToolRegistry(): ToolRegistry;
    getCommandRegistry(): CommandRegistry;
    getModelProvider(): ProviderManager;
    getWorkspacePath(): string;
    getSkillRegistry(): any;
    getLogger(): Logger;
  };
  config: any;
}
