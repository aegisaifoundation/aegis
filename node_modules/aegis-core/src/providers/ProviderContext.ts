import { Logger } from '../plugins/PluginContext.js';
import { EventBus, eventBus } from '../runtime/EventBus.js';
import { workspaceManager } from '../runtime/WorkspaceManager.js';
import { configurationManager } from '../config/ConfigurationManager.js';

export interface ProviderContext {
  services: {
    getEventBus(): EventBus;
    getLogger(): Logger;
    getWorkspacePath(): string;
  };
  config: any;
}

export function createProviderContext(name: string): ProviderContext {
  const logger: Logger = {
    info: (message: string, context?: any) => eventBus.emit('log', { level: 'INFO', message, context }),
    debug: (message: string, context?: any) => eventBus.emit('log', { level: 'DEBUG', message, context }),
    warn: (message: string, context?: any) => eventBus.emit('log', { level: 'WARN', message, context }),
    error: (message: string, context?: any) => eventBus.emit('log', { level: 'ERROR', message, context }),
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
