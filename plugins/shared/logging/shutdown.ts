import type { PluginContext } from '@aegis/plugins';
import fs from 'fs';
import path from 'path';

export default async function shutdown(context: PluginContext): Promise<void> {
  const eventBus = context.services.getEventBus();
  const workspacePath = context.services.getWorkspacePath();
  const logFile = path.join(workspacePath, 'logs', 'runtime.log');

  const timestamp = new Date().toISOString();
  if (fs.existsSync(path.dirname(logFile))) {
    try {
      fs.appendFileSync(logFile, `[${timestamp}] [INFO] [LoggingPlugin] Logging plugin shutting down.\n`, 'utf8');
    } catch (e) {}
  }

  const handlers = (context as any)._loggingHandlers;
  if (handlers) {
    for (const [event, handler] of Object.entries(handlers)) {
      eventBus.off(event, handler as any);
    }
  }
}
