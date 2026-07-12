import { eventBus } from '../eventbus/EventBus.js';
import { workspaceManager } from '../workspace/WorkspaceManager.js';
import { configurationManager, config } from '../config/index.js';
import { capabilityManager } from '../services/CapabilityManager.js';
import { serviceRegistry } from '../registry/ServiceRegistry.js';
import { CommandLoader } from './CommandLoader.js';
import { commandRegistry } from './CommandRegistry.js';
export const commandServices = {
    getExecutor: () => serviceRegistry.get('runtimeExecutor'),
    getRegistry: () => commandRegistry,
    getEventBus: () => eventBus,
    getWorkspacePath: () => workspaceManager.getWorkspacePath(),
    getConversationContext: () => serviceRegistry.get('conversationContext'),
    getModelProvider: () => serviceRegistry.get('providerManager'),
    getToolRegistry: () => serviceRegistry.get('toolRegistry'),
    getToolLoader: () => {
        // Dynamically resolve ToolLoader
        const toolLoader = serviceRegistry.get('toolLoader');
        if (toolLoader)
            return toolLoader;
        throw new Error('ToolLoader not found in serviceRegistry');
    },
    getConfigurationManager: () => configurationManager,
    getCommandLoader: () => new CommandLoader(),
    getConfig: () => config,
    getPluginRegistry: () => serviceRegistry.get('pluginRegistry'),
    getSkillRegistry: () => serviceRegistry.get('skillRegistry'),
    getCapabilityManager: () => capabilityManager,
    getLogger: () => ({
        info: (message, context) => eventBus.emit('log', { level: 'INFO', message, context }),
        debug: (message, context) => eventBus.emit('log', { level: 'DEBUG', message, context }),
        warn: (message, context) => eventBus.emit('log', { level: 'WARN', message, context }),
        error: (message, context) => eventBus.emit('log', { level: 'ERROR', message, context }),
    }),
};
export { CommandState } from '../types/Command.js';
