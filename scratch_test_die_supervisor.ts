import { Bootloader, consoleLogger } from './packages/aegis-runtime/src/index.js';
import { DistributedIntelligenceEngine } from './packages/aegis-distributed-intelligence/src/adapter/DistributedIntelligenceEngine.js';

async function main() {
  consoleLogger.info('=============================================');
  consoleLogger.info('Testing AEGIS DIE Supervisor & Process Launch');
  consoleLogger.info('=============================================');

  const engine = new DistributedIntelligenceEngine();
  consoleLogger.info(`Target Executable: ${(engine as any).resolveExecutable()}`);

  const mockContext: any = {
    getEventBus: () => ({
      emit: (event: string, payload: any, source: string) => {
        consoleLogger.info(`[EventBus Emit] (${source}) ${event}: ${JSON.stringify(payload)}`);
      }
    }),
    getLogger: () => consoleLogger,
    getConfig: () => ({})
  };

  try {
    consoleLogger.info('1. Initializing DistributedIntelligenceEngine...');
    await engine.initialize(mockContext);

    consoleLogger.info('2. Starting DistributedIntelligenceEngine...');
    await engine.start();

    consoleLogger.info(`✓ Child Process PID: ${engine.getPid()}`);
    consoleLogger.info(`✓ Engine State: ${engine.getState()}`);

    const health = await engine.health();
    consoleLogger.info(`✓ Health Report: ${JSON.stringify(health)}`);

    consoleLogger.info('3. Shutting down DistributedIntelligenceEngine...');
    await engine.shutdown();
    consoleLogger.info('✓ Engine shut down gracefully.');

    consoleLogger.info('=============================================');
    consoleLogger.info('SUPERVISOR TEST PASSED SUCCESSFULLY!');
    consoleLogger.info('=============================================');
  } catch (err) {
    consoleLogger.error('supervisor test failed:', err);
    process.exit(1);
  }
}

main();
