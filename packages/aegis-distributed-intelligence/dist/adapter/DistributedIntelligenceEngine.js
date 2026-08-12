import { serviceRegistry } from '@aegis/runtime';
import { EngineLifecycle } from '../lifecycle/EngineLifecycle.js';
import { EngineState } from '../state/EngineState.js';
import { DiscoveryService, MessagingService, TransportService, ExecutionService, CapabilityService, ResourceService, TrustService, SchedulerService, EventService } from '../services/index.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import net from 'net';
import { MessageType } from '../ipc/MessageTypes.js';
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
    tcpServer = null;
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
        await this.lifecycle.configure(config);
    }
    async start() {
        await this.lifecycle.start();
        // Start local P2P TCP server fallback on the configured port
        const config = this.lifecycle.getConfigurationManager().get();
        const port = config.port || 9900;
        const host = config.host || '0.0.0.0';
        this.tcpServer = net.createServer((socket) => {
            let buffer = Buffer.alloc(0);
            socket.on('data', (chunk) => {
                buffer = Buffer.concat([buffer, chunk]);
                while (buffer.length >= 4) {
                    const payloadLen = buffer.readUInt32BE(0);
                    if (buffer.length >= 4 + payloadLen) {
                        const payloadStr = buffer.subarray(4, 4 + payloadLen).toString('utf8');
                        buffer = buffer.subarray(4 + payloadLen);
                        // Parse payload string as TYPE|BODY
                        const pipe = payloadStr.indexOf('|');
                        if (pipe !== -1) {
                            const type = payloadStr.substring(0, pipe);
                            const bodyStr = payloadStr.substring(pipe + 1);
                            try {
                                const body = JSON.parse(bodyStr);
                                // Forward the packet as MessageType.EVENT to our local IPC manager
                                this.getIpcManager().emit('packet', {
                                    messageType: MessageType.EVENT,
                                    payload: {
                                        type: 'peer_message',
                                        messageType: type,
                                        senderId: body.senderId || 'remote-node',
                                        payload: body.payload || body
                                    }
                                });
                            }
                            catch { }
                        }
                    }
                    else {
                        break;
                    }
                }
            });
            socket.on('error', () => { });
        });
        this.tcpServer.listen(port, host, () => {
            console.log(`[DistributedIntelligenceEngine] P2P TCP Server listening on ${host}:${port}`);
        });
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
        if (this.tcpServer) {
            this.tcpServer.close();
            this.tcpServer = null;
        }
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