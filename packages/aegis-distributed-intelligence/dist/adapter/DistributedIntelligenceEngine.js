import { serviceRegistry } from '@aegis/runtime';
import { EngineLifecycle } from '../lifecycle/EngineLifecycle.js';
import { EngineState } from '../state/EngineState.js';
import { DiscoveryService, MessagingService, TransportService, ExecutionService, CapabilityService, ResourceService, TrustService, SchedulerService, EventService, activeEngines } from '../services/index.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class DistributedIntelligenceEngine {
    metadata = {
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
    lifecycle = new EngineLifecycle();
    context;
    nodeName = 'aegis-die-node';
    port = 9900;
    discoveryService = new DiscoveryService(this);
    messagingService = new MessagingService(this);
    transportService = new TransportService(this);
    executionService = new ExecutionService(this);
    capabilityService = new CapabilityService(this);
    resourceService = new ResourceService(this);
    trustService = new TrustService(this);
    schedulerService = new SchedulerService(this);
    eventService = new EventService(this);
    getIpcManager() {
        return this.lifecycle.getIpcManager();
    }
    async initialize(context) {
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
    async configure(config) {
        if (config.nodeName)
            this.nodeName = config.nodeName;
        if (config.port)
            this.port = config.port;
        await this.lifecycle.configure(config);
        activeEngines.set(this.nodeName, this);
    }
    async start() {
        await this.lifecycle.start();
    }
    async pause() {
        await this.lifecycle.pause();
    }
    async resume() {
        await this.lifecycle.resume();
    }
    async health() {
        const report = this.lifecycle.getHealthMonitor().getHealthReport();
        if (!report.details)
            report.details = {};
        report.details.pid = this.getPid();
        return report;
    }
    async reload() {
        await this.lifecycle.reload();
    }
    async shutdown() {
        await this.lifecycle.shutdown();
    }
    async dispose() {
        await this.lifecycle.dispose();
    }
    getState() {
        const state = this.lifecycle.getStateMachine().getState();
        if (state === EngineState.INITIALIZING)
            return 'REGISTERED';
        return state;
    }
    getPid() {
        return this.lifecycle.getSupervisor().getChildProcess()?.pid;
    }
    getStartedAt() {
        return this.lifecycle.getStartedAt();
    }
    getUptimeMs() {
        return this.lifecycle.getUptimeMs();
    }
    getRestartCount() {
        return this.lifecycle.getRestartCount();
    }
    resolveExecutable() {
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
                }
                catch { }
            }
            dir = path.dirname(dir);
        }
        const exe = process.platform === 'win32' ? 'die-service.exe' : 'die-service';
        return path.resolve(__dirname, '..', 'dist', exe);
    }
}
export default DistributedIntelligenceEngine;
//# sourceMappingURL=DistributedIntelligenceEngine.js.map