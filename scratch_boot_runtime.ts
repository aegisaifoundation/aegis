import { loadEnvironment, workspaceManager, serviceRegistry, eventBus, consoleLogger } from './packages/aegis-runtime/src/index.js';

consoleLogger.info('=========================================');
consoleLogger.info('Starting Standalone aegis-runtime Kernel');
consoleLogger.info('=========================================');

// 1. Load System Environment Variables
loadEnvironment();
consoleLogger.info('✓ Environment variables loaded.');

// 2. Initialize the Workspace Manager
workspaceManager.initialize();
const wsPath = workspaceManager.getWorkspacePath();
consoleLogger.info(`✓ Workspace resolved at: ${wsPath}`);

// 3. Register Core Services into the Service Registry
serviceRegistry.register('workspace', workspaceManager);
serviceRegistry.register('eventBus', eventBus);
consoleLogger.info('✓ Core services registered into ServiceRegistry.');

// 4. Register a subscriber on the EventBus
eventBus.on('system.test_boot', (envelope) => {
  consoleLogger.info(`★ Event captured! Source: [${envelope.source}] Topic: [${envelope.event}]`);
  consoleLogger.info(`★ Event Payload: ${JSON.stringify(envelope.payload)}`);
});

// 5. Emit a test event
consoleLogger.info('Emitting test event...');
eventBus.emit('system.test_boot', { status: 'RUNNING_INDEPENDENTLY', uptime: process.uptime() }, 'runtime-kernel');

consoleLogger.info('=========================================');
consoleLogger.info('aegis-runtime booted successfully!');
consoleLogger.info('=========================================');
