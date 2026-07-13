import type { PluginContext } from '@aegis/plugins';
import fs from 'fs';
import path from 'path';

let eventHandlers: { [key: string]: (envelope: any) => void } = {};

export default async function initialize(context: PluginContext): Promise<void> {
  const eventBus = context.services.getEventBus();
  const workspacePath = context.services.getWorkspacePath();
  const logDir = path.join(workspacePath, 'logs');
  
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logFile = path.join(logDir, 'runtime.log');

  const logEnvelope = (envelope: any) => {
    const timestampStr = new Date(envelope.timestamp || Date.now()).toISOString();
    const logLine = `[${timestampStr}] [${envelope.event.toUpperCase()}] [${envelope.source}] ${JSON.stringify(envelope.payload)}\n`;
    try {
      fs.appendFileSync(logFile, logLine, 'utf8');
    } catch (e) {
      // Isolate failures
    }
  };

  // Log that the plugin has initialized
  const initTimestamp = new Date().toISOString();
  try {
    fs.appendFileSync(logFile, `[${initTimestamp}] [INFO] [LoggingPlugin] Logging plugin initialized.\n`, 'utf8');
  } catch (e) {}

  // Subscribe to required events
  const eventsToSubscribe = [
    'runtime_started',
    'skill_executed',
    'provider_failed',
    'execution_completed',
    'command_executed',
    'memory.read',
    'memory.updated',
    'memory.deleted',
    'memory.failed'
  ];

  for (const event of eventsToSubscribe) {
    const handler = (envelope: any) => {
      logEnvelope(envelope);
    };
    eventHandlers[event] = handler;
    eventBus.on(event, handler);
  }

  // Keep reference for shutdown
  (context as any)._loggingHandlers = eventHandlers;
}
