import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { serviceRegistry } from '@aegis/runtime';
import { UnifiedPlatformEngine } from '../index.js';
import { EventSpecification } from '../eventbus/EventSpecification.js';
import { GracefulDegradator } from '../degradation/GracefulDegradator.js';

export async function runPlatformSimulation() {
  console.log('='.repeat(70));
  console.log('         AEGIS UNIFIED INTELLIGENCE PLATFORM (AUIP) SIMULATION');
  console.log('='.repeat(70));

  const workspaceRoot = process.cwd();
  const testDir = path.resolve(workspaceRoot, '.test-platform-sim');
  if (existsSync(testDir)) {
    await fs.rm(testDir, { recursive: true, force: true });
  }
  await fs.mkdir(testDir, { recursive: true });

  // 1. Setup mock EventBus and Logger
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

  const mockLogger = {
    info: (msg: string) => console.log(`[Runtime Info] ${msg}`),
    warn: (msg: string) => console.log(`[Runtime Warn] ${msg}`),
    error: (msg: string) => console.log(`[Runtime Error] ${msg}`),
    log: (level: string, msg: string) => console.log(`[Runtime ${level}] ${msg}`)
  };

  // Setup DI container services
  serviceRegistry.register('eventBus', mockEventBus);
  serviceRegistry.register('logger', mockLogger);

  const mockContext: any = {
    getWorkspacePath: () => testDir,
    getLogger: () => mockLogger,
    getEventBus: () => mockEventBus,
    getConfig: () => ({}),
    getSecrets: () => ({})
  };

  // Listen to E2E updates
  mockEventBus.on('platform.event', (event: any) => {
    console.log(`[BUS EVENT] [${event.eventType}] Priority: ${event.priority} | Source: ${event.sourceEngine}`);
    console.log(`  Payload:`, JSON.stringify(event.payload));
  });

  mockEventBus.on('dashboard.update', (status: any) => {
    console.log(`[DASHBOARD SYNC] Installed: [${status.installedEngines.join(', ')}] | Active Jobs: ${status.activeJobs} | Active Rounds: ${status.activeRounds}`);
  });

  // 2. Initialize and boot AUIP
  console.log('\n--- Step 1: Booting Microkernel & AUIP ---');
  const auip = new UnifiedPlatformEngine();
  await auip.initialize(mockContext);
  await auip.start();

  const capRegistry = serviceRegistry.get<any>('aegis-unified-platform:capability');
  const dashboard = serviceRegistry.get<any>('aegis-unified-platform:dashboard');

  // 3. Install Data Engine (ADE)
  console.log('\n--- Step 2: Dynamic Installation of Data Engine (ADE) ---');
  // Register Data Engine mock in service registry
  const mockDataEngine = {
    metadata: { id: 'aegis-data', displayName: 'AEGIS Data Engine' },
    status: 'ACTIVE',
    DatasetMetadata: async () => ({ name: 'Oncology Records', status: 'Ingested' })
  };
  serviceRegistry.register('aegis-data', mockDataEngine);

  // Publish Install events
  let ev: any = EventSpecification.createEvent('PackageInstalled', 'aegis-package-manager', { packageId: 'aegis-data' });
  EventSpecification.publishEvent(mockEventBus, ev);

  capRegistry.registerCapabilities('aegis-data', {
    displayName: 'AEGIS Data Engine',
    capabilities: ['Ingestion', 'PII Redaction', 'Tokenization'],
    publicApis: ['PrepareDataset', 'DatasetMetadata'],
    supportedModels: [],
    trainingMethods: [],
    learningAlgorithms: [],
    tools: ['PatientDataTool'],
    skills: [],
    policies: ['HIPAA Enforcement'],
    resources: {}
  });

  ev = EventSpecification.createEvent('DatasetCreated', 'aegis-data', { datasetId: 'clinical-oncology' });
  EventSpecification.publishEvent(mockEventBus, ev);

  // 4. Install Training Engine (ATE)
  console.log('\n--- Step 3: Dynamic Installation of Training Engine (ATE) ---');
  
  // Set up mock ATE services
  const mockAteScheduler = {
    queue: [{ jobId: 'job-onc-1', status: 'RUNNING' }],
    async getQueue() { return this.queue; }
  };
  const mockAte = {
    metadata: { id: 'aegis-training-engine', displayName: 'AEGIS Training Engine' },
    HardwareStatus: async () => ({
      cpuUsagePercent: 32,
      gpuUsagePercent: 78,
      availableVramMb: 8192
    })
  };
  
  serviceRegistry.register('aegis-training-engine:scheduler', mockAteScheduler);
  serviceRegistry.register('aegis-training-engine', mockAte);

  ev = EventSpecification.createEvent('PackageInstalled', 'aegis-package-manager', { packageId: 'aegis-training-engine' });
  EventSpecification.publishEvent(mockEventBus, ev);

  capRegistry.registerCapabilities('aegis-training-engine', {
    displayName: 'AEGIS Training Engine',
    capabilities: ['Local Training', 'Adapter Optimization', 'Telemetry'],
    publicApis: ['CreateTrainingJob', 'HardwareStatus'],
    supportedModels: ['llama-3-8b'],
    trainingMethods: ['LoRA', 'QLoRA'],
    learningAlgorithms: [],
    tools: [],
    skills: [],
    policies: ['Low VRAM policy'],
    resources: { gpu: true }
  });

  ev = EventSpecification.createEvent('TrainingStarted', 'aegis-training-engine', { jobId: 'job-onc-1', datasetId: 'clinical-oncology' });
  EventSpecification.publishEvent(mockEventBus, ev);

  ev = EventSpecification.createEvent('TrainingProgress', 'aegis-training-engine', { jobId: 'job-onc-1', step: 100, loss: 0.85 });
  EventSpecification.publishEvent(mockEventBus, ev);

  ev = EventSpecification.createEvent('LoRAExported', 'aegis-training-engine', { jobId: 'job-onc-1', adapterName: 'lora-oncology-v1' });
  EventSpecification.publishEvent(mockEventBus, ev);

  // 5. Install Distributed Learning Engine (ADLE)
  console.log('\n--- Step 4: Dynamic Installation of Distributed Learning (ADLE) ---');

  const mockDistributedLearning = {
    metadata: { id: 'aegis-distributed-learning', displayName: 'Distributed Learning Engine' },
    health: async () => ({ details: { activeRounds: 1 } })
  };
  serviceRegistry.register('aegis-distributed-learning', mockDistributedLearning);
  serviceRegistry.register('aegis-federated-learning', mockDistributedLearning); // bound for health

  ev = EventSpecification.createEvent('PackageInstalled', 'aegis-package-manager', { packageId: 'aegis-distributed-learning' });
  EventSpecification.publishEvent(mockEventBus, ev);

  capRegistry.registerCapabilities('aegis-distributed-learning', {
    displayName: 'Distributed Learning Engine',
    capabilities: ['Federated Learning', 'Swarm Aggregation'],
    publicApis: ['publishModelUpdate', 'aggregateWeights'],
    supportedModels: ['llama-3-8b'],
    trainingMethods: [],
    learningAlgorithms: ['FedAvg', 'Swarm consensus'],
    tools: [],
    skills: [],
    policies: [],
    resources: {}
  });

  ev = EventSpecification.createEvent('LearningRoundCreated', 'aegis-distributed-learning', { roundId: 'round-1', epoch: 1 });
  EventSpecification.publishEvent(mockEventBus, ev);

  ev = EventSpecification.createEvent('SwarmLeaderElected', 'aegis-distributed-learning', { leaderNodeId: 'node-123' });
  EventSpecification.publishEvent(mockEventBus, ev);

  ev = EventSpecification.createEvent('LearningRoundCompleted', 'aegis-distributed-learning', { roundId: 'round-1', loss: 0.42 });
  EventSpecification.publishEvent(mockEventBus, ev);

  // 6. AI Runtime registers new model
  console.log('\n--- Step 5: AI Runtime registers new aggregated model ---');
  
  const mockModelRegistry = {
    registeredModels: [] as string[],
    registerModel(meta: any) {
      this.registeredModels.push(meta.id);
      console.log(`[MockModelRegistry] Model registered: ${meta.id}`);
    }
  };
  serviceRegistry.register('distributed-inference', { modelRegistry: mockModelRegistry });

  ev = EventSpecification.createEvent('InferenceStarted', 'distributed-inference', { modelId: 'lora-oncology-v1' });
  EventSpecification.publishEvent(mockEventBus, ev);

  mockModelRegistry.registerModel({ id: 'lora-oncology-v1', name: 'Aggregated Oncology adapter' });

  // 7. Collective Intelligence and Knowledge publication
  console.log('\n--- Step 6: Collective Intelligence experience publication ---');
  
  ev = EventSpecification.createEvent('ExperienceRecorded', 'aegis-collective-intelligence', { taskId: 'clinical-summarization', success: true });
  EventSpecification.publishEvent(mockEventBus, ev);

  ev = EventSpecification.createEvent('KnowledgePublished', 'aegis-knowledge-sync', { knowledgeId: 'know-oncology-guidelines', hash: 'sha256:guidelinehash' });
  EventSpecification.publishEvent(mockEventBus, ev);

  // 8. Hot Swapping: Dynamic removal of Distributed Learning Engine
  console.log('\n--- Step 7: Hot Swapping - Uninstalling Distributed Learning ---');
  
  // Unregister service
  serviceRegistry.register('aegis-distributed-learning', null);
  serviceRegistry.register('aegis-federated-learning', null);
  capRegistry.unregisterCapabilities('aegis-distributed-learning');

  ev = EventSpecification.createEvent('PackageRemoved', 'aegis-package-manager', { packageId: 'aegis-distributed-learning' });
  EventSpecification.publishEvent(mockEventBus, ev);

  // Verify graceful degradation: check that federated learning status is resolved as ServiceUnavailable
  const fedService = GracefulDegradator.getService('aegis-federated-learning');
  console.log(`[GracefulDegradation Check] Is federated learning service unavailable?`, fedService.isUnavailable);

  // Verify local training is still operational
  const localScheduler = GracefulDegradator.getService('aegis-training-engine:scheduler');
  console.log(`[GracefulDegradation Check] Is local training scheduler available?`, !localScheduler.isUnavailable);

  // 9. Reinstall Distributed Learning Engine without reboot
  console.log('\n--- Step 8: Hot Swapping - Reinstalling Distributed Learning ---');

  serviceRegistry.register('aegis-distributed-learning', mockDistributedLearning);
  serviceRegistry.register('aegis-federated-learning', mockDistributedLearning);

  ev = EventSpecification.createEvent('PackageInstalled', 'aegis-package-manager', { packageId: 'aegis-distributed-learning' });
  EventSpecification.publishEvent(mockEventBus, ev);

  capRegistry.registerCapabilities('aegis-distributed-learning', {
    displayName: 'Distributed Learning Engine',
    capabilities: ['Federated Learning', 'Swarm Aggregation'],
    publicApis: ['publishModelUpdate', 'aggregateWeights'],
    supportedModels: ['llama-3-8b'],
    trainingMethods: [],
    learningAlgorithms: ['FedAvg', 'Swarm consensus'],
    tools: [],
    skills: [],
    policies: [],
    resources: {}
  });

  const fedServiceReinstalled = GracefulDegradator.getService('aegis-federated-learning');
  console.log(`[GracefulDegradation Check] Is federated learning service available after reinstall?`, !fedServiceReinstalled.isUnavailable);

  // 10. Shutdown
  await auip.shutdown();
  await fs.rm(testDir, { recursive: true, force: true });

  console.log('='.repeat(70));
  console.log('         AUIP SIMULATION SUCCESSFULLY COMPLETED');
  console.log('='.repeat(70));
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('PlatformSimulation.ts')) {
  runPlatformSimulation().catch(err => {
    console.error('[Simulation Error]', err);
    process.exit(1);
  });
}
