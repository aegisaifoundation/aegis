import { serviceRegistry } from './ServiceRegistry.js';
import { RuntimeContext, Logger } from '../types/Message.js';

export class RuntimeServices {
  createContext(name: string): RuntimeContext {
    const eventBus = serviceRegistry.get<any>('eventBus');
    const providerManager = serviceRegistry.get<any>('providerManager');
    const configManager = serviceRegistry.get<any>('config');
    const workspaceManager = serviceRegistry.get<any>('workspaceManager');

    const logger: Logger = {
      info: (message: string, context?: any) => eventBus.emit('log', { level: 'INFO', message, context }),
      debug: (message: string, context?: any) => eventBus.emit('log', { level: 'DEBUG', message, context }),
      warn: (message: string, context?: any) => eventBus.emit('log', { level: 'WARN', message, context }),
      error: (message: string, context?: any) => eventBus.emit('log', { level: 'ERROR', message, context }),
    };

    const runtimeConfig = configManager.getRuntimeConfig();
    const specificConfig =
      runtimeConfig.plugins?.[name] ||
      runtimeConfig.skills?.[name] ||
      runtimeConfig.providers?.[name] ||
      runtimeConfig.tools?.[name] ||
      {};

    const memoryRegistry = serviceRegistry.has('memoryRegistry') ? serviceRegistry.get<any>('memoryRegistry') : undefined;

    return {
      eventBus,
      providerManager,
      logger,
      config: specificConfig,
      workspacePath: workspaceManager.getWorkspacePath(),
      memoryRegistry,
    };
  }
}

export const runtimeServices = new RuntimeServices();
