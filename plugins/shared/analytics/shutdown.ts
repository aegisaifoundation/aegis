import type { PluginContext } from '@aegis/plugins';

export default async function shutdown(context: PluginContext): Promise<void> {
  const eventBus = context.services.getEventBus();
  const handlers = (context as any)._analyticsHandlers;
  if (handlers) {
    for (const [event, handler] of Object.entries(handlers)) {
      eventBus.off(event, handler as any);
    }
  }
}
