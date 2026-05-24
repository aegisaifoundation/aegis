import { runtimeExecutor } from '../runtime/RuntimeExecutor.js';
import { commandRegistry } from './CommandRegistry.js';
import { eventBus } from '../runtime/EventBus.js';
import { workspaceManager } from '../runtime/WorkspaceManager.js';
import { conversationContext } from '../context/ConversationContext.js';
import { providerManager } from '../providers/index.js';
import { toolRegistry, ToolLoader } from '../tools/index.js';
import { configurationManager, config } from '../config/index.js';
import { CommandLoader } from './CommandLoader.js';
import { pluginRegistry } from '../plugins/PluginRegistry.js';
import { capabilityManager } from '../runtime/CapabilityManager.js';
import { skillRegistry } from '../skills/index.js';
export const runtimeServices = {
    getExecutor: () => runtimeExecutor,
    getRegistry: () => commandRegistry,
    getEventBus: () => eventBus,
    getWorkspacePath: () => workspaceManager.getWorkspacePath(),
    getConversationContext: () => conversationContext,
    getModelProvider: () => providerManager,
    getToolRegistry: () => toolRegistry,
    getToolLoader: () => new ToolLoader(),
    getConfigurationManager: () => configurationManager,
    getCommandLoader: () => new CommandLoader(),
    getConfig: () => config,
    getPluginRegistry: () => pluginRegistry,
    getSkillRegistry: () => skillRegistry,
    getCapabilityManager: () => capabilityManager,
    getLogger: () => ({
        info: (message, context) => eventBus.emit('log', { level: 'INFO', message, context }),
        debug: (message, context) => eventBus.emit('log', { level: 'DEBUG', message, context }),
        warn: (message, context) => eventBus.emit('log', { level: 'WARN', message, context }),
        error: (message, context) => eventBus.emit('log', { level: 'ERROR', message, context }),
    }),
};
export { CommandState } from './types/Command.js';
