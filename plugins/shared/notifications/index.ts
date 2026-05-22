import { PluginContext } from '../../../aegis-core/src/plugins/PluginContext.js';

let pluginContext: PluginContext | null = null;
const queue: any[] = [];

function getContext(): PluginContext {
  if (!pluginContext) {
    throw new Error("Notifications plugin has not been initialized yet.");
  }
  return pluginContext;
}

export default {
  name: "notifications",
  category: "shared",
  description: "Event-driven notifications: queue alerts and publish notification_published events",
  version: "1.0.0",

  async initialize(context: PluginContext): Promise<void> {
    pluginContext = context;
    const logger = context.services.getLogger();
    logger.info("Notifications plugin initialized.");
  },

  async shutdown(context: PluginContext): Promise<void> {
    const logger = context.services.getLogger();
    logger.info("Notifications plugin shut down.");
    queue.length = 0;
    pluginContext = null;
  },

  publish(notification: { title: string; body: string; severity?: string }): void {
    const ctx = getContext();
    const payload = {
      id: `notif-${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toISOString(),
      severity: notification.severity || 'info',
      title: notification.title,
      body: notification.body
    };

    queue.push(payload);
    if (queue.length > 100) {
      queue.shift();
    }

    ctx.services.getEventBus().emit('notification_published', payload);
  },

  getHistory(): any[] {
    return [...queue];
  },

  clearHistory(): void {
    queue.length = 0;
  }
};
