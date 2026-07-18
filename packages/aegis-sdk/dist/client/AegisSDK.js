import crypto from 'crypto';
import { mapErrorCodeToException } from '../errors/SdkErrors.js';
import { serviceRegistry } from '@aegis/runtime';
// ==========================================
// MOCK TRANSPORT
// ==========================================
export class MockTransport {
    connected = false;
    listeners = new Map();
    async connect(options) {
        this.connected = true;
        console.log(`[MockTransport] Connected to ${options.endpoint}`);
    }
    async disconnect() {
        this.connected = false;
    }
    async send(message) {
        if (!this.connected) {
            return { success: false, error: { code: 'RuntimeUnavailable', message: 'Mock transport not connected.' } };
        }
        // Custom mock responses for unit tests
        if (message.category === 'Runtime' && message.method === 'Version') {
            return { success: true, result: '1.0.0' };
        }
        if (message.category === 'AI Runtime' && message.method === 'Generate') {
            return { success: true, result: { text: `Mock response to: ${message.params.prompt}` } };
        }
        if (message.category === 'Memory' && message.method === 'StoreMemory') {
            return { success: true, result: { status: 'Stored', id: message.params.key } };
        }
        return { success: true, result: { status: 'MockSuccess', category: message.category, method: message.method } };
    }
    async subscribe(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
        return `mock-sub-${crypto.randomUUID()}`;
    }
    async unsubscribe(subscriptionId) { }
}
// ==========================================
// LOOPBACK TRANSPORT (routes direct to microkernel container)
// ==========================================
export class LoopbackTransport {
    connected = false;
    listeners = new Map();
    async connect() {
        this.connected = true;
        console.log(`[LoopbackTransport] Loopback initialized.`);
    }
    async disconnect() {
        this.connected = false;
    }
    async send(message) {
        if (!this.connected) {
            return { success: false, error: { code: 'RuntimeUnavailable', message: 'Loopback transport disconnected.' } };
        }
        // Dynamic routing to microkernel serviceRegistry components
        try {
            if (message.category === 'Runtime') {
                if (message.method === 'Version')
                    return { success: true, result: '1.0.0' };
                if (message.method === 'RuntimeHealth')
                    return { success: true, result: { status: 'HEALTHY' } };
            }
            if (message.category === 'AI Runtime') {
                // Find distributed inference engine or unified platform
                if (serviceRegistry.has('aegis-distributed-inference')) {
                    const inf = serviceRegistry.get('aegis-distributed-inference');
                    if (message.method === 'Generate') {
                        const res = await inf.generate?.(message.params.prompt);
                        return { success: true, result: res || { text: 'Inference completed' } };
                    }
                }
            }
            if (message.category === 'Dataset') {
                if (serviceRegistry.has('aegis-data')) {
                    const data = serviceRegistry.get('aegis-data');
                    if (message.method === 'CreateDataset') {
                        const meta = await data.DatasetMetadata?.();
                        return { success: true, result: { id: message.params.id, ...meta } };
                    }
                }
            }
            if (message.category === 'Training') {
                if (serviceRegistry.has('aegis-training-engine:scheduler')) {
                    const ate = serviceRegistry.get('aegis-training-engine:scheduler');
                    if (message.method === 'CreateTrainingJob') {
                        return { success: true, result: { jobId: message.params.jobId, status: 'RUNNING' } };
                    }
                }
            }
            // Check if service is missing -> Degrade Gracefully by returning FeatureUnavailable
            return {
                success: false,
                error: {
                    code: 'FeatureUnavailable',
                    message: `The capability category "${message.category}" / "${message.method}" is currently unavailable on this node.`
                }
            };
        }
        catch (err) {
            return {
                success: false,
                error: {
                    code: 'InferenceFailed',
                    message: err.message,
                    stack: err.stack
                }
            };
        }
    }
    async subscribe(event, callback) {
        if (serviceRegistry.has('eventBus')) {
            const bus = serviceRegistry.get('eventBus');
            bus.on(event, callback);
        }
        return `loopback-sub-${crypto.randomUUID()}`;
    }
    async unsubscribe(subscriptionId) { }
}
// ==========================================
// AEGIS SDK CLASS
// ==========================================
export class AegisSDK {
    transport;
    apiKey;
    correlationId = `corr-${crypto.randomUUID()}`;
    sessionId = `sess-${crypto.randomUUID()}`;
    userId = 'user-default';
    constructor(transport) {
        this.transport = transport;
    }
    static async initialize(options = {}) {
        let client;
        if (options.transport === 'mock') {
            client = new MockTransport();
        }
        else {
            client = new LoopbackTransport();
        }
        await client.connect({
            endpoint: options.endpoint || 'loopback',
            apiKey: options.apiKey
        });
        const sdk = new AegisSDK(client);
        sdk.apiKey = options.apiKey;
        return sdk;
    }
    async shutdown() {
        await this.transport.disconnect();
    }
    setSession(sessionId, userId) {
        this.sessionId = sessionId;
        if (userId)
            this.userId = userId;
    }
    // System call executor
    async syscall(category, method, params = {}) {
        const msg = {
            category,
            method,
            params,
            context: {
                correlationId: `corr-${crypto.randomUUID()}`,
                sessionId: this.sessionId,
                userId: this.userId
            },
            authHeader: this.apiKey ? `Bearer ${this.apiKey}` : undefined
        };
        const res = await this.transport.send(msg);
        if (!res.success && res.error) {
            throw mapErrorCodeToException(res.error.code, res.error.message);
        }
        return res.result;
    }
    // ==========================================
    // SYSTEM CALLS: RUNTIME
    // ==========================================
    async version() {
        return this.syscall('Runtime', 'Version');
    }
    async platformInfo() {
        return this.syscall('Runtime', 'PlatformInfo');
    }
    async runtimeHealth() {
        return this.syscall('Runtime', 'RuntimeHealth');
    }
    // ==========================================
    // SYSTEM CALLS: NODE
    // ==========================================
    async nodeInfo() {
        return this.syscall('Node', 'NodeInfo');
    }
    // ==========================================
    // SYSTEM CALLS: PACKAGES
    // ==========================================
    async installPackage(packageId) {
        return this.syscall('Packages', 'InstallPackage', { packageId });
    }
    // ==========================================
    // SYSTEM CALLS: DATASET
    // ==========================================
    async createDataset(id, path) {
        return this.syscall('Dataset', 'CreateDataset', { id, path });
    }
    // ==========================================
    // SYSTEM CALLS: TRAINING
    // ==========================================
    async createTrainingJob(jobId, datasetId) {
        return this.syscall('Training', 'CreateTrainingJob', { jobId, datasetId });
    }
    async exportLoRA(jobId) {
        return this.syscall('Training', 'ExportLoRA', { jobId });
    }
    // ==========================================
    // SYSTEM CALLS: FEDERATED LEARNING
    // ==========================================
    async createLearningRound(roundId) {
        return this.syscall('Federated Learning', 'CreateLearningRound', { roundId });
    }
    // ==========================================
    // SYSTEM CALLS: SWARM LEARNING
    // ==========================================
    async createSwarm(swarmId) {
        return this.syscall('Swarm Learning', 'CreateSwarm', { swarmId });
    }
    // ==========================================
    // SYSTEM CALLS: AI RUNTIME
    // ==========================================
    async generate(prompt, options = {}) {
        return this.syscall('AI Runtime', 'Generate', { prompt, options });
    }
    // ==========================================
    // SYSTEM CALLS: COLLABORATION
    // ==========================================
    async discoverNodes() {
        return this.syscall('Collaboration', 'DiscoverNodes');
    }
    // ==========================================
    // SYSTEM CALLS: COLLECTIVE INTELLIGENCE
    // ==========================================
    async publishKnowledge(key, content) {
        return this.syscall('Collective Intelligence', 'PublishKnowledge', { key, content });
    }
    // ==========================================
    // SYSTEM CALLS: MEMORY
    // ==========================================
    async storeMemory(key, value) {
        return this.syscall('Memory', 'StoreMemory', { key, value });
    }
    // ==========================================
    // SYSTEM CALLS: EVENTS
    // ==========================================
    async subscribe(event, callback) {
        return this.transport.subscribe(event, callback);
    }
}
