// Type imports from aegis-core types
import type { PluginContext } from '../../aegis-core/src/plugins/PluginContext.js';

let eventHandlers: { [key: string]: (...args: any[]) => void } = {};

export default async function initialize(context: PluginContext): Promise<void> {
  const logger = context.services.getLogger();
  logger.info('Template Plugin initializing...');

  const eventBus = context.services.getEventBus();
  
  // Set up event listeners or initialize resources
  eventHandlers['log'] = (data: any) => {
    // Example: listen to general log events
  };

  for (const [event, handler] of Object.entries(eventHandlers)) {
    eventBus.on(event, handler);
  }

  // Save references on context to cleanly unsubscribe on shutdown
  (context as any)._templateHandlers = eventHandlers;

  logger.info('Template Plugin initialized successfully.');
}
