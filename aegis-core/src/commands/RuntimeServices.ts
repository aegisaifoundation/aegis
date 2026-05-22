import { runtimeExecutor } from '../runtime/RuntimeExecutor.js';
import { commandRegistry } from './CommandRegistry.js';
import { eventBus } from '../runtime/EventBus.js';
import { workspaceManager } from '../runtime/WorkspaceManager.js';
import { conversationContext } from '../context/ConversationContext.js';
import { modelHandler } from '../models/index.js';
import { toolRegistry, ToolLoader } from '../tools/index.js';
import { configurationManager, config } from '../config/index.js';
import { CommandLoader } from './CommandLoader.js';

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
};
export type { CommandRegistry } from './CommandRegistry.js';
export type { CommandContext } from './types/CommandContext.js';
export type { Command, CommandResult } from './types/Command.js';
export type { CommandManifest } from './types/CommandManifest.js';
export type { CommandInvocation } from './types/CommandInvocation.js';
export { CommandState } from './types/Command.js';
