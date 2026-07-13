// Import types from @aegis/plugins — the correct package, not a relative aegis-core path.
import type { PluginContext } from '@aegis/plugins';

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
