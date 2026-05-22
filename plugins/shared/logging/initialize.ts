import { PluginContext } from '../../../aegis-core/src/plugins/PluginContext.js';
import fs from 'fs';
import path from 'path';

let eventHandlers: { [key: string]: (...args: any[]) => void } = {};

export default async function initialize(context: PluginContext): Promise<void> {
  const eventBus = context.services.getEventBus();
  const workspacePath = context.services.getWorkspacePath();
  const logDir = path.join(workspacePath, 'logs');
  
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const logFile = path.join(logDir, 'runtime.log');

  const log = (level: string, section: string, message: string) => {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] [${level}] [${section}] ${message}\n`;
    try {
      fs.appendFileSync(logFile, formatted, 'utf8');
    } catch (e) {
      // Isolate failures
    }
  };

  log('INFO', 'LoggingPlugin', 'Logging plugin initialized.');

  // Subscribe to log and core events
  eventHandlers['log'] = (data: any) => {
    if (data && typeof data === 'object') {
      log(data.level || 'INFO', 'App', data.message + (data.context ? ' ' + JSON.stringify(data.context) : ''));
    } else {
      log('INFO', 'App', String(data));
    }
  };
  eventHandlers['thinking_started'] = () => log('INFO', 'Runtime', 'Thinking started');
  eventHandlers['thinking_finished'] = () => log('INFO', 'Runtime', 'Thinking finished');
  eventHandlers['response_started'] = () => log('INFO', 'Provider', 'Streaming response started');
  eventHandlers['response_finished'] = (content: string) => log('INFO', 'Provider', `Streaming response finished. Length: ${content.length}`);
  eventHandlers['response_chunk'] = (chunk: string) => log('DEBUG', 'Provider', `Received chunk: ${chunk.trim()}`);
  eventHandlers['tool_started'] = (msg: any) => log('INFO', 'Tool', `Tool '${msg.name}' started with input: ${msg.input}`);
  eventHandlers['tool_finished'] = (msg: any) => log('INFO', 'Tool', `Tool '${msg.name}' finished with output length: ${msg.output?.length || 0}`);
  eventHandlers['command_started'] = (msg: any) => log('INFO', 'Command', `Command '/${msg.name}' started with arguments: ${msg.input}`);
  eventHandlers['command_executed'] = (msg: any) => log('INFO', 'Command', `Command '/${msg.name}' completed with success: ${msg.success}`);
  eventHandlers['command_failed'] = (msg: any) => log('ERROR', 'Command', `Command '/${msg.name}' failed: ${msg.error}`);
  eventHandlers['runtime_error'] = (error: string) => log('ERROR', 'Runtime', `Runtime error: ${error}`);
  eventHandlers['plugin_registered'] = (msg: any) => log('INFO', 'PluginSystem', `Plugin registered: ${msg.name}`);
  eventHandlers['plugin_state_changed'] = (msg: any) => log('INFO', 'PluginSystem', `Plugin ${msg.name} state changed to ${msg.state}`);
  eventHandlers['plugin_failed'] = (msg: any) => log('ERROR', 'PluginSystem', `Plugin ${msg.name} failed: ${msg.error}`);

  for (const [event, handler] of Object.entries(eventHandlers)) {
    eventBus.on(event, handler);
  }

  // Keep reference for shutdown
  (context as any)._loggingHandlers = eventHandlers;
}
