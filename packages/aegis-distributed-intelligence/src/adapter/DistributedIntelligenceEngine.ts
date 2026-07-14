import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';
import { serviceRegistry } from '@aegis/runtime';
import { EngineLifecycle } from '../lifecycle/EngineLifecycle.js';
import { EngineState } from '../state/EngineState.js';
import {
  DiscoveryService,
  MessagingService,
  TransportService,
  ExecutionService,
  CapabilityService,
  ResourceService,
  TrustService,
  SchedulerService,
  EventService,
  IEngineIpcHost
} from '../services/index.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DistributedIntelligenceEngine implements IEngine, IEngineIpcHost {
  readonly metadata: IEngineMetadata = {
    id: 'distributed-intelligence',
    displayName: 'Distributed Intelligence Engine',
    version: '1.0.0',
    kernelApiVersion: '1.0.0',
    dependencies: [],
    priority: 5,
    autoStart: true,
    singleton: true,
    permissions: ['process:spawn', 'network:tcp', 'fs:read'],
  };

  private lifecycle = new EngineLifecycle();
  private context!: IRuntimeContext_v1;

  readonly discoveryService = new DiscoveryService(this);
  readonly messagingService = new MessagingService(this);
  readonly transportService = new TransportService(this);
  readonly executionService = new ExecutionService(this);
  readonly capabilityService = new CapabilityService(this);
  readonly resourceService = new ResourceService(this);
  readonly trustService = new TrustService(this);
  readonly schedulerService = new SchedulerService(this);
  readonly eventService = new EventService(this);

  getIpcManager() {
    return this.lifecycle.getIpcManager();
  }

  async initialize(context: IRuntimeContext_v1): Promise<void> {
    this.context = context;
    const executablePath = this.resolveExecutable();

    // Set up runtime event publisher
    this.lifecycle.on('runtimeEvent', (eventName, payload) => {
      this.context.getEventBus()?.emit(eventName, payload, 'distributed-intelligence');
    });

    // Forward standard status events to the global event bus
    this.lifecycle.on('state', (state) => {
      if (state === EngineState.ONLINE) {
        this.context.getEventBus()?.emit('engine:ready', { engineId: this.metadata.id });
      }
    });

    // Register inside service registry
    serviceRegistry.register('distributed-intelligence', this);
    serviceRegistry.register('distributed-intelligence:discovery', this.discoveryService);
    serviceRegistry.register('distributed-intelligence:messaging', this.messagingService);
    serviceRegistry.register('distributed-intelligence:execution', this.executionService);
    serviceRegistry.register('distributed-intelligence:trust', this.trustService);

    await this.lifecycle.initialize(context, executablePath);
  }

  async configure(config: Record<string, any>): Promise<void> {
    await this.lifecycle.configure(config);
  }

  async start(): Promise<void> {
    await this.lifecycle.start();
  }

  async pause(): Promise<void> {
    await this.lifecycle.pause();
  }

  async resume(): Promise<void> {
    await this.lifecycle.resume();
  }

  async health(): Promise<EngineHealthReport> {
    const report = this.lifecycle.getHealthMonitor().getHealthReport();
    if (!report.details) report.details = {};
    report.details.pid = this.getPid();
    return report;
  }

  async reload(): Promise<void> {
    await this.lifecycle.reload();
  }

  async shutdown(): Promise<void> {
    await this.lifecycle.shutdown();
  }

  async dispose(): Promise<void> {
    await this.lifecycle.dispose();
  }

  getState(): string {
    const state = this.lifecycle.getStateMachine().getState();
    if (state === EngineState.INITIALIZING) return 'REGISTERED';
    return state;
  }

  getPid(): number | undefined {
    return this.lifecycle.getSupervisor().getChildProcess()?.pid;
  }

  getStartedAt(): Date | null {
    return this.lifecycle.getStartedAt();
  }

  getUptimeMs(): number {
    return this.lifecycle.getUptimeMs();
  }

  getRestartCount(): number {
    return this.lifecycle.getRestartCount();
  }

  private resolveExecutable(): string {
    let dir = __dirname;
    while (dir !== path.dirname(dir)) {
      const pkg = path.join(dir, 'package.json');
      if (fs.existsSync(pkg)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(pkg, 'utf8'));
          if (parsed.name === '@aegis/distributed-intelligence') {
            const exe = process.platform === 'win32' ? 'die-service.exe' : 'die-service';
            return path.join(dir, 'dist', exe);
          }
        } catch {}
      }
      dir = path.dirname(dir);
    }
    const exe = process.platform === 'win32' ? 'die-service.exe' : 'die-service';
    return path.resolve(__dirname, '..', 'dist', exe);
  }
}
export default DistributedIntelligenceEngine;
