import { PluginContext } from '../../../aegis-core/src/plugins/PluginContext.js';
import fs from 'fs';
import path from 'path';

export default async function initialize(context: PluginContext): Promise<void> {
  const eventBus = context.services.getEventBus();
  const workspacePath = context.services.getWorkspacePath();
  const analyticsFile = path.join(workspacePath, 'logs', 'analytics.json');

  const stats = {
    commandUsage: {} as Record<string, number>,
    toolUsage: {} as Record<string, number>,
    providerInvocations: 0,
    totalErrors: 0
  };

  const saveStats = () => {
    try {
      const dir = path.dirname(analyticsFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(analyticsFile, JSON.stringify(stats, null, 2), 'utf8');
    } catch (e) {
      // Isolate failures
    }
  };

  const handlers: Record<string, (envelope: any) => void> = {
    'command_executed': (envelope: any) => {
      const msg = envelope.payload;
      stats.commandUsage[msg.name] = (stats.commandUsage[msg.name] || 0) + 1;
      saveStats();
    },
    'tool_finished': (envelope: any) => {
      const msg = envelope.payload;
      stats.toolUsage[msg.name] = (stats.toolUsage[msg.name] || 0) + 1;
      saveStats();
    },
    'thinking_finished': () => {
      stats.providerInvocations++;
      saveStats();
    },
    'runtime_error': () => {
      stats.totalErrors++;
      saveStats();
    }
  };

  for (const [event, handler] of Object.entries(handlers)) {
    eventBus.on(event, handler);
  }

  (context as any)._analyticsHandlers = handlers;
}
