import { serviceRegistry } from './ServiceRegistry.js';
export class RuntimeServices {
    createContext(name) {
        const eventBus = serviceRegistry.get('eventBus');
        const providerManager = serviceRegistry.get('providerManager');
        const configManager = serviceRegistry.get('config');
        const workspaceManager = serviceRegistry.get('workspaceManager');
        const logger = {
            info: (message, context) => eventBus.emit('log', { level: 'INFO', message, context }),
            debug: (message, context) => eventBus.emit('log', { level: 'DEBUG', message, context }),
            warn: (message, context) => eventBus.emit('log', { level: 'WARN', message, context }),
            error: (message, context) => eventBus.emit('log', { level: 'ERROR', message, context }),
        };
        const runtimeConfig = configManager.getRuntimeConfig();
        const specificConfig = runtimeConfig.plugins?.[name] ||
            runtimeConfig.skills?.[name] ||
            runtimeConfig.providers?.[name] ||
            runtimeConfig.tools?.[name] ||
            {};
        return {
            eventBus,
            providerManager,
            logger,
            config: specificConfig,
            workspacePath: workspaceManager.getWorkspacePath(),
        };
    }
}
export const runtimeServices = new RuntimeServices();
export { serviceRegistry };
