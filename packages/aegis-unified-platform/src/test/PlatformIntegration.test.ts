import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import { serviceRegistry } from '@aegis/runtime';
import {
  UnifiedPlatformEngine,
  EventSpecification,
  capabilityRegistry,
  GracefulDegradator,
  ServiceUnavailable,
  UnifiedConfig,
  unifiedMonitor,
  unifiedDashboardSync
} from '../index.js';

describe('AEGIS Unified Intelligence Platform (AUIP) Integration Tests', () => {
  let auip: UnifiedPlatformEngine;

  // Mock EventBus
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

  // Mock Logger
  const mockLogger = {
    info: () => {},
    warn: () => {},
    error: () => {},
    log: () => {}
  };

  const mockContext: any = {
    getWorkspacePath: () => process.cwd(),
    getLogger: () => mockLogger,
    getEventBus: () => mockEventBus,
    getConfig: () => ({}),
    getSecrets: () => ({})
  };

  before(async () => {
    // Clear registries
    capabilityRegistry.clear();
    UnifiedConfig.clearCache();

    // Register mocks in serviceRegistry
    serviceRegistry.register('eventBus', mockEventBus);
    serviceRegistry.register('logger', mockLogger);

    const mockEngineManager = {
      list: () => [
        { metadata: { id: 'aegis-unified-platform' } }
      ]
    };
    serviceRegistry.register('engineManager', mockEngineManager);

    auip = new UnifiedPlatformEngine();
    await auip.initialize(mockContext);
    await auip.start();
  });

  after(async () => {
    await auip.shutdown();
  });

  test('Metadata and initialization validation', () => {
    assert.strictEqual(auip.metadata.id, 'aegis-unified-platform');
    assert.strictEqual(auip.metadata.displayName, 'AEGIS Unified Intelligence Platform');
    assert.ok(serviceRegistry.has('aegis-unified-platform'));
  });

  test('Unified Event Envelope generation and propagation', (t, done) => {
    mockEventBus.on('TrainingStarted', (event: any) => {
      assert.strictEqual(event.eventType, 'TrainingStarted');
      assert.strictEqual(event.sourceEngine, 'aegis-training-engine');
      assert.strictEqual(event.priority, 'HIGH');
      assert.strictEqual(event.payload.jobId, 'job-test-01');
      done();
    });

    const event = EventSpecification.createEvent(
      'TrainingStarted',
      'aegis-training-engine',
      { jobId: 'job-test-01' },
      { priority: 'HIGH' }
    );
    EventSpecification.publishEvent(mockEventBus, event);
  });

  test('Capability discovery and registry updates', () => {
    capabilityRegistry.registerCapabilities('aegis-data', {
      displayName: 'AEGIS Data Engine',
      capabilities: ['PII Redaction'],
      publicApis: ['PrepareDataset'],
      supportedModels: [],
      trainingMethods: [],
      learningAlgorithms: [],
      tools: [],
      skills: [],
      policies: [],
      resources: {}
    });

    const cap = capabilityRegistry.getCapabilities('aegis-data');
    assert.ok(cap);
    assert.strictEqual(cap.displayName, 'AEGIS Data Engine');
    assert.ok(cap.capabilities.includes('PII Redaction'));

    const list = capabilityRegistry.listAllCapabilities();
    assert.ok(list.length >= 2); // AUIP + data engine
  });

  test('Configuration inheritance resolution', () => {
    // Set engine level config override
    UnifiedConfig.setEngineConfig('aegis-training-engine', 'epochs', 5);
    
    const epochs = UnifiedConfig.resolve('aegis-training-engine', 'epochs', undefined, 3);
    assert.strictEqual(epochs, 5);

    // Resolve default if missing
    const lr = UnifiedConfig.resolve('aegis-training-engine', 'learningRate', undefined, 2e-4);
    assert.strictEqual(lr, 2e-4);
  });

  test('Graceful degradation & ServiceUnavailable proxies', () => {
    // Request an unavailable service
    const mockFederated = GracefulDegradator.getService('aegis-federated-learning-absent');
    assert.strictEqual(mockFederated, ServiceUnavailable);
    assert.strictEqual(mockFederated.isUnavailable, true);

    // Dynamic invocation of methods on absent service returns null instead of crashing
    const result = mockFederated.startRound('round-abc');
    assert.strictEqual(result, null);
  });

  test('Unified Platform status monitor & dashboard sync', async () => {
    const status = await unifiedMonitor.getPlatformStatus();
    assert.strictEqual(status.runtimeStatus, 'ACTIVE');
    assert.ok(status.installedEngines.includes('aegis-unified-platform'));

    // Trigger sync
    const synced = await unifiedDashboardSync.syncAndBroadcast();
    assert.strictEqual(synced.nodeId, 'node-123');
    assert.strictEqual(synced.runtimeStatus, 'ACTIVE');
  });
});
