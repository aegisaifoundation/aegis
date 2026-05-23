import { eventBus } from '../runtime/EventBus.js';
import { workspaceManager } from '../runtime/WorkspaceManager.js';
import { configurationManager } from '../config/ConfigurationManager.js';
export function createProviderContext(name) {
    const logger = {
        info: (message, context) => eventBus.emit('log', { level: 'INFO', message, context }),
        debug: (message, context) => eventBus.emit('log', { level: 'DEBUG', message, context }),
        warn: (message, context) => eventBus.emit('log', { level: 'WARN', message, context }),
        error: (message, context) => eventBus.emit('log', { level: 'ERROR', message, context }),
    };
    const runtimeConfig = configurationManager.getRuntimeConfig();
    const providerConfig = runtimeConfig.providers?.[name] || {};
    return {
        services: {
            getEventBus: () => eventBus,
            getLogger: () => logger,
            getWorkspacePath: () => workspaceManager.getWorkspacePath(),
        },
        config: providerConfig,
    };
}
