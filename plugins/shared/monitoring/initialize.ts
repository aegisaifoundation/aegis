import { PluginContext } from '../../../aegis-core/src/plugins/PluginContext.js';
import fs from 'fs';
import path from 'path';

export default async function initialize(context: PluginContext): Promise<void> {
  const eventBus = context.services.getEventBus();
  const workspacePath = context.services.getWorkspacePath();
  const healthFile = path.join(workspacePath, 'logs', 'health.json');

  const healthSnapshot = {
    status: 'HEALTHY',
    lastCheck: new Date().toISOString(),
    failures: [] as string[],
    providerAvailable: false
  };

  const checkHealth = async () => {
    try {
      const modelProvider = context.services.getModelProvider();
      healthSnapshot.providerAvailable = await modelProvider.checkModelAvailability();
    } catch (e: any) {
      healthSnapshot.providerAvailable = false;
      healthSnapshot.failures.push(`Provider check failed: ${e.message}`);
    }

    if (healthSnapshot.failures.length > 10) {
      healthSnapshot.status = 'UNHEALTHY';
    } else if (healthSnapshot.failures.length > 5) {
      healthSnapshot.status = 'DEGRADED';
    } else {
      healthSnapshot.status = 'HEALTHY';
    }

    healthSnapshot.lastCheck = new Date().toISOString();
    try {
      const dir = path.dirname(healthFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(healthFile, JSON.stringify(healthSnapshot, null, 2), 'utf8');
    } catch (e) {
      // Isolate
    }
  };

  // Run initial check
  await checkHealth();

  const handlers: Record<string, (envelope: any) => void> = {
    'plugin_failed': (envelope: any) => {
      const msg = envelope.payload;
      healthSnapshot.failures.push(`Plugin '${msg.name}' failed: ${msg.error}`);
      checkHealth();
    },
    'runtime_error': (envelope: any) => {
      healthSnapshot.failures.push(`Runtime error: ${envelope.payload}`);
      checkHealth();
    },
    'command_failed': (envelope: any) => {
      const msg = envelope.payload;
      healthSnapshot.failures.push(`Command '${msg.name}' failed: ${msg.error}`);
      checkHealth();
    }
  };

  for (const [event, handler] of Object.entries(handlers)) {
    eventBus.on(event, handler);
  }

  (context as any)._monitoringHandlers = handlers;
}
