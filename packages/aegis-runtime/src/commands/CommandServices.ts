import { eventBus } from '../eventbus/EventBus.js';
import { workspaceManager } from '../workspace/WorkspaceManager.js';
import { configurationManager, config } from '../config/index.js';
import { capabilityManager } from '../services/CapabilityManager.js';
import { serviceRegistry } from '../registry/ServiceRegistry.js';
import { CommandLoader } from './CommandLoader.js';
import { commandRegistry } from './CommandRegistry.js';

export interface CommandServices {
  getExecutor(): any;
  getRegistry(): any;
  getEventBus(): any;
  getWorkspacePath(): string;
  getConversationContext(): any;
  getModelProvider(): any;
  getToolRegistry(): any;
  getToolLoader(): any;
  getConfigurationManager(): any;
  getCommandLoader(): any;
  getConfig(): any;
  getPluginRegistry(): any;
  getSkillRegistry(): any;
  getCapabilityManager(): any;
  getLogger(): any;
}

export const commandServices: CommandServices = {
  getExecutor: () => serviceRegistry.get<any>('runtimeExecutor'),
  getRegistry: () => commandRegistry,
  getEventBus: () => eventBus,
  getWorkspacePath: () => workspaceManager.getWorkspacePath(),
  getConversationContext: () => serviceRegistry.get<any>('conversationContext'),
  getModelProvider: () => serviceRegistry.get<any>('providerManager'),
  getToolRegistry: () => serviceRegistry.get<any>('toolRegistry'),
  getToolLoader: () => {
    // Dynamically resolve ToolLoader
    const toolLoader = serviceRegistry.get<any>('toolLoader');
    if (toolLoader) return toolLoader;
    throw new Error('ToolLoader not found in serviceRegistry');
  },
  getConfigurationManager: () => configurationManager,
  getCommandLoader: () => new CommandLoader(),
  getConfig: () => config,
  getPluginRegistry: () => serviceRegistry.get<any>('pluginRegistry'),
  getSkillRegistry: () => serviceRegistry.get<any>('skillRegistry'),
  getCapabilityManager: () => capabilityManager,
  getLogger: () => ({
    info: (message: string, context?: any) => eventBus.emit('log', { level: 'INFO', message, context }),
    debug: (message: string, context?: any) => eventBus.emit('log', { level: 'DEBUG', message, context }),
    warn: (message: string, context?: any) => eventBus.emit('log', { level: 'WARN', message, context }),
    error: (message: string, context?: any) => eventBus.emit('log', { level: 'ERROR', message, context }),
  }),
};

export type { CommandRegistry } from './CommandRegistry.js';
export type { CommandContext } from '../types/Command.js';
export type { Command, CommandResult } from '../types/Command.js';
export type { CommandManifest } from './types/CommandManifest.js';
export type { CommandInvocation } from './types/CommandInvocation.js';
export { CommandState } from '../types/Command.js';
