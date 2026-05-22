import { runtimeExecutor } from '../runtime/RuntimeExecutor.js';
import { commandRegistry } from './CommandRegistry.js';
import { eventBus } from '../runtime/EventBus.js';
import { workspaceManager } from '../runtime/WorkspaceManager.js';
import { conversationContext } from '../context/ConversationContext.js';
import { modelHandler } from '../models/index.js';
import { toolRegistry, ToolLoader } from '../tools/index.js';
import { configurationManager, config } from '../config/index.js';
import { CommandLoader } from './CommandLoader.js';
export const runtimeServices = {
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
export { CommandState } from './types/Command.js';
