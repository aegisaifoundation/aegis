import { serviceRegistry } from '@aegis/runtime';
import { EngineLifecycle } from '../lifecycle/EngineLifecycle.js';
import { EngineState } from '../state/EngineState.js';
import { DiscoveryService, MessagingService, TransportService, ExecutionService, CapabilityService, ResourceService, TrustService, SchedulerService, EventService, activeEngines } from '../services/index.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
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
        // Register incoming P2P connection request handlers
        this.messagingService.onMessage('connection_request', async (payload, senderId) => {
            await this.handleIncomingConnectionRequest(payload, senderId);
        });
        this.messagingService.onMessage('connection_accepted', async (payload, senderId) => {
            await this.handleIncomingConnectionApproval(payload, senderId);
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
    getRequestsFilePath() {
        const workspacePath = this.context.getWorkspacePath();
        const dotAegisPath = path.resolve(workspacePath, '../.aegis');
        if (!fs.existsSync(dotAegisPath)) {
            fs.mkdirSync(dotAegisPath, { recursive: true });
        }
        return path.join(dotAegisPath, 'connection_requests.json');
    }
    async getConnectionRequests() {
        const filePath = this.getRequestsFilePath();
        if (!fs.existsSync(filePath)) {
            return [];
        }
        try {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
        catch {
            return [];
        }
    }
    async saveConnectionRequests(requests) {
        const filePath = this.getRequestsFilePath();
        fs.writeFileSync(filePath, JSON.stringify(requests, null, 2), 'utf8');
    }
    async requestConnection(targetNodeId) {
        const peer = this.discoveryService.getLocalPeer(targetNodeId);
        if (!peer) {
            throw new Error(`Node "${targetNodeId}" is not registered locally. Use registerNode first.`);
        }
        const requests = await this.getConnectionRequests();
        const requestId = crypto.randomUUID();
        const newRequest = {
            requestId,
            senderNodeId: this.nodeName,
            senderHost: '127.0.0.1',
            senderPort: this.port,
            targetNodeId,
            status: 'pending',
            timestamp: new Date().toISOString()
        };
        requests.push(newRequest);
        await this.saveConnectionRequests(requests);
        // Send connection request via messagingService
        await this.messagingService.sendMessage(targetNodeId, 'connection_request', {
            requestId,
            senderHost: '127.0.0.1',
            senderPort: this.port
        });
    }
    async acceptConnectionRequest(requestId) {
        const requests = await this.getConnectionRequests();
        const req = requests.find((r) => r.requestId === requestId);
        if (!req) {
            throw new Error(`Connection request with ID "${requestId}" not found.`);
        }
        req.status = 'accepted';
        await this.saveConnectionRequests(requests);
        // Register peer in discoveryService
        await this.discoveryService.registerNode(req.senderNodeId, req.senderHost, req.senderPort);
        // Send connection approval back to the sender
        await this.messagingService.sendMessage(req.senderNodeId, 'connection_accepted', {
            requestId,
            targetHost: '127.0.0.1',
            targetPort: this.port
        });
    }
    async handleIncomingConnectionRequest(payload, senderId) {
        const requests = await this.getConnectionRequests();
        // Prevent duplicate request records
        if (requests.some((r) => r.requestId === payload.requestId)) {
            return;
        }
        const newRequest = {
            requestId: payload.requestId,
            senderNodeId: senderId,
            senderHost: payload.senderHost,
            senderPort: payload.senderPort,
            targetNodeId: this.nodeName,
            status: 'pending',
            timestamp: new Date().toISOString()
        };
        requests.push(newRequest);
        await this.saveConnectionRequests(requests);
    }
    async handleIncomingConnectionApproval(payload, senderId) {
        const requests = await this.getConnectionRequests();
        const req = requests.find((r) => r.requestId === payload.requestId);
        if (req) {
            req.status = 'accepted';
            await this.saveConnectionRequests(requests);
        }
        // Register the approved target node
        await this.discoveryService.registerNode(senderId, payload.targetHost, payload.targetPort);
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