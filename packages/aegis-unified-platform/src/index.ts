import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';
import { serviceRegistry } from '@aegis/runtime';
import { capabilityRegistry } from './registry/CapabilityRegistry.js';
import { unifiedDashboardSync } from './dashboard/UnifiedDashboardSync.js';
import { unifiedMonitor } from './monitoring/UnifiedMonitor.js';
import { EventSpecification } from './eventbus/EventSpecification.js';

export class UnifiedPlatformEngine implements IEngine {
  readonly metadata: IEngineMetadata = {
    id: 'aegis-unified-platform',
    displayName: 'AEGIS Unified Intelligence Platform',
    version: '1.0.0',
    kernelApiVersion: '1.0.0',
    dependencies: [],
    priority: 20,
    autoStart: true,
    singleton: true,
    permissions: ['fs:read', 'fs:write']
  };

  private context!: IRuntimeContext_v1;
  private isRunning = false;

  async initialize(context: IRuntimeContext_v1): Promise<void> {
    this.context = context;
    context.getLogger().info('Initializing AEGIS Unified Intelligence Platform (AUIP)...', 'platform');

    const bus = context.getEventBus();
    
    // Configure event bus on CapabilityRegistry & DashboardSync
    capabilityRegistry.setEventBus(bus);
    unifiedDashboardSync.initialize(bus);

    // Register AUIP services in the serviceRegistry
    serviceRegistry.register('aegis-unified-platform', this);
    serviceRegistry.register('aegis-unified-platform:capability', capabilityRegistry);
    serviceRegistry.register('aegis-unified-platform:monitor', unifiedMonitor);
    serviceRegistry.register('aegis-unified-platform:dashboard', unifiedDashboardSync);

    // Register active capabilities on startup
    capabilityRegistry.registerCapabilities('aegis-unified-platform', {
      displayName: 'AUIP Integration Layer',
      capabilities: ['Dynamic discovery', 'Unified config', 'Monitoring', 'Logging'],
      publicApis: ['getPlatformStatus', 'resolveConfig', 'publishEvent'],
      supportedModels: [],
      trainingMethods: [],
      learningAlgorithms: [],
      tools: [],
      skills: [],
      policies: [],
      resources: {}
    });
  }

  async configure(config: Record<string, any>): Promise<void> {
    this.context.getLogger().info('Configuring Unified Intelligence Platform...', 'platform');
  }

  async start(): Promise<void> {
    this.context.getLogger().info('Starting Unified Intelligence Platform...', 'platform');
    this.isRunning = true;

    // Publish boot started event
    const event = EventSpecification.createEvent(
      'NodeStarted',
      'aegis-unified-platform',
      { status: 'ACTIVE' },
      { priority: 'HIGH' }
    );
    EventSpecification.publishEvent(this.context.getEventBus(), event);
    
    // Initial dashboard update broadcast
    await unifiedDashboardSync.syncAndBroadcast();
  }

  async shutdown(): Promise<void> {
    this.context.getLogger().info('Shutting down Unified Intelligence Platform...', 'platform');
    
    const event = EventSpecification.createEvent(
      'NodeStopped',
      'aegis-unified-platform',
      { status: 'STOPPED' },
      { priority: 'HIGH' }
    );
    EventSpecification.publishEvent(this.context.getEventBus(), event);

    this.isRunning = false;
  }

  async pause(): Promise<void> {}
  async resume(): Promise<void> {}
  async reload(): Promise<void> {}
  async dispose(): Promise<void> {
    await this.shutdown();
  }

  async health(): Promise<EngineHealthReport> {
    return {
      status: this.isRunning ? 'HEALTHY' : 'UNHEALTHY',
      latencyMs: 0,
      details: {
        registeredCapabilities: capabilityRegistry.listAllCapabilities().length
      }
    };
  }
}

export default UnifiedPlatformEngine;

export * from './types/index.js';
export * from './eventbus/EventSpecification.js';
export * from './registry/CapabilityRegistry.js';
export * from './degradation/GracefulDegradator.js';
export * from './config/UnifiedConfig.js';
export * from './logging/UnifiedLogger.js';
export * from './monitoring/UnifiedMonitor.js';
export * from './dashboard/UnifiedDashboardSync.js';
