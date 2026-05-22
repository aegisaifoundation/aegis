// Type imports from aegis-core types
import type { PluginContext } from '../../aegis-core/src/plugins/PluginContext.js';

export default async function shutdown(context: PluginContext): Promise<void> {
  const logger = context.services.getLogger();
  logger.info('Template Plugin shutting down...');

  const eventBus = context.services.getEventBus();
  const handlers = (context as any)._templateHandlers;

  // Unsubscribe listeners to avoid memory leaks
  if (handlers) {
    for (const [event, handler] of Object.entries(handlers)) {
      eventBus.off(event, handler as any);
    }
  }

  logger.info('Template Plugin shut down completed.');
}
