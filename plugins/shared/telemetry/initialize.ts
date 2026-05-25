import { PluginContext } from '../../../aegis-core/src/plugins/PluginContext.js';
import fs from 'fs';
import path from 'path';

export default async function initialize(context: PluginContext): Promise<void> {
  const eventBus = context.services.getEventBus();
  const workspacePath = context.services.getWorkspacePath();
  const metricsFile = path.join(workspacePath, 'logs', 'telemetry.json');

  const metrics = {
    commands: {} as Record<string, { count: number; totalDurationMs: number }>,
    tools: {} as Record<string, { count: number; totalDurationMs: number }>,
    provider: { count: 0, totalDurationMs: 0 }
  };

  const commandStarts = new Map<string, number>();
  const toolStarts = new Map<string, number>();
  let providerStart = 0;

  const saveMetrics = () => {
    try {
      const dir = path.dirname(metricsFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(metricsFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        memoryUsage: process.memoryUsage(),
        metrics
      }, null, 2), 'utf8');
    } catch (e) {
      // Isolate failures
    }
  };

  const handlers: Record<string, (envelope: any) => void> = {
    'command_started': (envelope: any) => {
      const msg = envelope.payload;
      commandStarts.set(msg.name, Date.now());
    },
    'command_executed': (envelope: any) => {
      const msg = envelope.payload;
      const start = commandStarts.get(msg.name);
      if (start) {
        const duration = Date.now() - start;
        commandStarts.delete(msg.name);
        if (!metrics.commands[msg.name]) {
          metrics.commands[msg.name] = { count: 0, totalDurationMs: 0 };
        }
        metrics.commands[msg.name].count++;
        metrics.commands[msg.name].totalDurationMs += duration;
        saveMetrics();
      }
    },
    'tool_started': (envelope: any) => {
      const msg = envelope.payload;
      toolStarts.set(msg.name, Date.now());
    },
    'tool_finished': (envelope: any) => {
      const msg = envelope.payload;
      const start = toolStarts.get(msg.name);
      if (start) {
        const duration = Date.now() - start;
        toolStarts.delete(msg.name);
        if (!metrics.tools[msg.name]) {
          metrics.tools[msg.name] = { count: 0, totalDurationMs: 0 };
        }
        metrics.tools[msg.name].count++;
        metrics.tools[msg.name].totalDurationMs += duration;
        saveMetrics();
      }
    },
    'thinking_started': () => {
      providerStart = Date.now();
    },
    'thinking_finished': () => {
      if (providerStart) {
        const duration = Date.now() - providerStart;
        providerStart = 0;
        metrics.provider.count++;
        metrics.provider.totalDurationMs += duration;
        saveMetrics();
      }
    }
  };

  for (const [event, handler] of Object.entries(handlers)) {
    eventBus.on(event, handler);
  }

  (context as any)._telemetryHandlers = handlers;
}
