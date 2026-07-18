import { AegisSDK } from '../index.js';
import { serviceRegistry } from '@aegis/runtime';

export async function runSdkSimulation() {
  console.log('='.repeat(70));
  console.log('             AEGIS SDK & AISCI SYSTEM CALL SIMULATION');
  console.log('='.repeat(70));

  // 1. Setup mock microkernel services for loopback test
  const mockEventBus = {
    listeners: new Map<string, Set<any>>(),
    on(event: string, fn: any) {
      if (!this.listeners.has(event)) this.listeners.set(event, new Set());
      this.listeners.get(event)!.add(fn);
    },
    emit(event: string, payload: any) {
      const set = this.listeners.get(event);
      if (set) {
        set.forEach(fn => fn(payload));
      }
    }
  };

  serviceRegistry.register('eventBus', mockEventBus);

  // Set up mock Data, Training and Inference engines
  const mockDataEngine = {
    DatasetMetadata: async () => ({ name: 'Mammography Ingestion', status: 'COMPLETED' })
  };
  const mockTrainingEngine = {
    queue: [],
    getQueue: async () => []
  };
  const mockInferenceEngine = {
    generate: async (prompt: string) => ({ text: `Generated response to: ${prompt}` })
  };

  serviceRegistry.register('aegis-data', mockDataEngine);
  serviceRegistry.register('aegis-training-engine:scheduler', mockTrainingEngine);
  serviceRegistry.register('aegis-distributed-inference', mockInferenceEngine);

  // 2. Initialize SDK
  console.log('\n--- Step 1: Initializing SDK client via Loopback ---');
  const aegis = await AegisSDK.initialize({ transport: 'loopback' });
  aegis.setSession('sess-oncology-research', 'user-radiologist');

  // 3. System Calls
  console.log('\n--- Step 2: Runtime & Node Queries ---');
  const ver = await aegis.version();
  console.log(`  ➔ Runtime Version:`, ver);

  const health = await aegis.runtimeHealth();
  console.log(`  ➔ Runtime Health:`, JSON.stringify(health));

  console.log('\n--- Step 3: Dataset Operations ---');
  const dataset = await aegis.createDataset('dataset-mam-01', '/data/mammography');
  console.log(`  ➔ Dataset Created:`, JSON.stringify(dataset));

  console.log('\n--- Step 4: Training Lifecycle ---');
  const job = await aegis.createTrainingJob('job-train-mam-01', 'dataset-mam-01');
  console.log(`  ➔ Training Job:`, JSON.stringify(job));

  console.log('\n--- Step 5: Event Subscriptions ---');
  await aegis.subscribe('TrainingProgress', (payload) => {
    console.log(`[EVENT EVENT] TrainingProgress received:`, JSON.stringify(payload));
  });

  // Emit mock training progress
  mockEventBus.emit('TrainingProgress', { jobId: 'job-train-mam-01', loss: 0.24, step: 250 });

  console.log('\n--- Step 6: AI Inference ---');
  const inference = await aegis.generate('Analyze mammography scan node density');
  console.log(`  ➔ AI Generation Output:`, JSON.stringify(inference));

  console.log('\n--- Step 7: Graceful Degradation Checks ---');
  try {
    // Attempting a call to missing swarm learning engine should return FeatureUnavailable AegisError
    await aegis.createSwarm('swarm-mam-cluster');
  } catch (err: any) {
    console.log(`  ➔ Graceful Degradation caught:`, err.message);
  }

  // 4. Shutdown
  console.log('\n--- Step 8: Shutting Down SDK Session ---');
  await aegis.shutdown();

  console.log('='.repeat(70));
  console.log('             ASDK SIMULATION SUCCESSFULLY COMPLETED');
  console.log('='.repeat(70));
}

if (process.argv[1] && process.argv[1].endsWith('SDKSimulation.ts')) {
  runSdkSimulation().catch(err => {
    console.error('[Simulation Error]', err);
    process.exit(1);
  });
}
