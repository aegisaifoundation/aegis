import { runtimeExecutor } from '../runtime/RuntimeExecutor.js';
import { commandRegistry } from './CommandRegistry.js';
import { eventBus } from '../runtime/EventBus.js';
import { workspaceManager } from '../runtime/WorkspaceManager.js';
import { conversationContext } from '../context/ConversationContext.js';
import { modelHandler } from '../models/index.js';
import { toolRegistry, ToolLoader } from '../tools/index.js';
import { configurationManager, config } from '../config/index.js';
import { CommandLoader } from './CommandLoader.js';

import { pluginRegistry, PluginRegistry } from '../plugins/PluginRegistry.js';
import { capabilityManager, CapabilityManager } from '../runtime/CapabilityManager.js';
import { Logger } from '../plugins/PluginContext.js';
import { skillRegistry, SkillRegistry } from '../skills/index.js';


export interface RuntimeServices {
  getExecutor(): typeof runtimeExecutor;
  getRegistry(): typeof commandRegistry;
  getEventBus(): typeof eventBus;
  getWorkspacePath(): string;
  getConversationContext(): typeof conversationContext;
  getModelProvider(): typeof modelHandler;
  getToolRegistry(): typeof toolRegistry;
  getToolLoader(): ToolLoader;
  getConfigurationManager(): typeof configurationManager;
  getCommandLoader(): CommandLoader;
  getConfig(): typeof config;
  getPluginRegistry(): PluginRegistry;
  getSkillRegistry(): SkillRegistry;
  getCapabilityManager(): CapabilityManager;
  getLogger(): Logger;
}

export const runtimeServices: RuntimeServices = {
  getExecutor: () => runtimeExecutor,
  getRegistry: () => commandRegistry,
  getEventBus: () => eventBus,
  getWorkspacePath: () => workspaceManager.getWorkspacePath(),
  getConversationContext: () => conversationContext,
  getModelProvider: () => modelHandler,
  getToolRegistry: () => toolRegistry,
  getToolLoader: () => new ToolLoader(),
  getConfigurationManager: () => configurationManager,
  getCommandLoader: () => new CommandLoader(),
  getConfig: () => config,
  getPluginRegistry: () => pluginRegistry,
  getSkillRegistry: () => skillRegistry,
  getCapabilityManager: () => capabilityManager,
  getLogger: () => ({
    info: (message: string, context?: any) => eventBus.emit('log', { level: 'INFO', message, context }),
    debug: (message: string, context?: any) => eventBus.emit('log', { level: 'DEBUG', message, context }),
    warn: (message: string, context?: any) => eventBus.emit('log', { level: 'WARN', message, context }),
    error: (message: string, context?: any) => eventBus.emit('log', { level: 'ERROR', message, context }),
  }),
};
export type { CommandRegistry } from './CommandRegistry.js';
export type { CommandContext } from './types/CommandContext.js';
export type { Command, CommandResult } from './types/Command.js';
export type { CommandManifest } from './types/CommandManifest.js';
export type { CommandInvocation } from './types/CommandInvocation.js';
export { CommandState } from './types/Command.js';
