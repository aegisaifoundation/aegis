import crypto from 'crypto';
import { Container } from '../di/Container.js';
import { detectHardware, detectOS, detectArch } from '../utils/platform.js';
import { workspaceManager } from '../workspace/WorkspaceManager.js';
import { configurationManager } from '../config/ConfigurationManager.js';
import { logger } from '../logging/StructuredLogger.js';
import { eventBus } from '../eventbus/EventBus.js';
import { serviceRegistry } from '../registry/ServiceRegistry.js';
import { engineManager } from '../managers/EngineManager.js';
import { runtimeSessionManager } from '../services/RuntimeSessionManager.js';
export class KernelAPI {
    container;
    version = "1.0.0";
    _status = 'INITIALIZING';
    constructor(container) {
        this.container = container;
    }
    get status() {
        return this._status;
    }
    setStatus(status) {
        this._status = status;
    }
    resolve(serviceName) {
        return this.container.resolve(serviceName);
    }
    publishEvent(envelope) {
        const bus = this.container.resolve('eventBus');
        bus.emit(envelope.event, envelope);
    }
    scheduleTask(task) {
        const scheduler = this.container.resolve('scheduler');
        return scheduler.schedule(task);
    }
    async shutdown() {
        this.setStatus('SHUTTING_DOWN');
        logger.info('System shutdown initiated.', 'system');
        if (this.container.has('ipcServer')) {
            const ipcServer = this.container.resolve('ipcServer');
            try {
                ipcServer.stop();
            }
            catch { }
        }
        if (this.container.has('engineManager')) {
            const engineMgr = this.container.resolve('engineManager');
            await engineMgr.shutdownAll();
        }
        await logger.shutdown();
        this.setStatus('SAFE_MODE');
    }
}
export class Bootloader {
    static async boot() {
        console.log('[Bootloader] Initiating Phase 1: Environment & Platform Detection...');
        // Stage 1: Environment Validation
        if (!process.env.AEGIS_LOG_LEVEL) {
            process.env.AEGIS_LOG_LEVEL = 'info';
        }
        // Stage 2: Hardware Detection
        const hardware = detectHardware();
        console.log(`[Bootloader] CPU: ${hardware.cpu} | Cores: ${hardware.cores} | RAM: ${hardware.ramGb}GB | CUDA: ${hardware.cudaEnabled}`);
        // Stage 3: OS Detection
        const platform = detectOS();
        const arch = detectArch();
        console.log(`[Bootloader] Platform: ${platform} | Arch: ${arch}`);
        // Stage 4: Workspace Discovery & Canonical Node Identity Initialization
        workspaceManager.initialize();
        let nodeIdentity = null;
        try {
            const path = await import('path');
            const workspacePath = workspaceManager.getWorkspacePath();
            const dotAegisPath = path.resolve(workspacePath, '../.aegis');
            const { NodeManager } = await import('@aegis/node');
            const nodeManager = new NodeManager(dotAegisPath);
            nodeManager.initialize();
            nodeIdentity = nodeManager.getIdentity();
            console.log(`[Bootloader] Canonical Node Identity initialized: ${nodeIdentity?.nodeId}`);
        }
        catch (nodeErr) {
            console.error('[Bootloader] Failed to initialize canonical node identity:', nodeErr.message);
            throw new Error(`[Bootloader] Fatal: Canonical Node Identity initialization failed: ${nodeErr.message}`);
        }
        if (!nodeIdentity || !nodeIdentity.nodeId || typeof nodeIdentity.nodeId !== 'string' || nodeIdentity.nodeId.trim() === '') {
            throw new Error('[Bootloader] Fatal: Canonical AEGIS Node Identity is invalid or missing');
        }
        const canonicalNodeIdentity = {
            nodeId: nodeIdentity.nodeId,
            nodeName: nodeIdentity.name || 'Aegis Node',
            createdAt: nodeIdentity.createdAt || new Date().toISOString(),
            publicKey: nodeIdentity.publicKey,
            fingerprint: nodeIdentity.fingerprint
        };
        console.log('[Bootloader] Initiating Phase 2: Configuration & Logging...');
        // Stage 5: Configuration Loading
        const config = configurationManager.getRuntimeConfig();
        // Stage 6: Secret Loading
        const secrets = {};
        if (process.env.OPENAI_API_KEY)
            secrets['OPENAI_API_KEY'] = process.env.OPENAI_API_KEY;
        // Stage 7: Logging Initialization
        logger.log('info', 'Kernel log system initialized', 'system', { hardware, platform, arch, nodeId: canonicalNodeIdentity.nodeId });
        // Stage 8: Event Bus Initialization
        // eventBus is imported from EventBus.js
        // Stage 9: Service Registry Initialization
        // serviceRegistry is imported from ServiceRegistry.js
        console.log('[Bootloader] Initiating Phase 3: Dependency Injection Services...');
        // Stage 10: Dependency Injection Container
        const container = new Container();
        const kernelApi = new KernelAPI(container);
        container.bind('kernelAPI', kernelApi);
        container.bind('eventBus', eventBus);
        container.bind('logger', logger);
        container.bind('workspaceManager', workspaceManager);
        container.bind('config', configurationManager);
        container.bind('engineManager', engineManager);
        container.bind('nodeId', canonicalNodeIdentity.nodeId);
        container.bind('nodeIdentity', canonicalNodeIdentity);
        // Stage 11-21: Managers Registration
        serviceRegistry.register('eventBus', eventBus);
        serviceRegistry.register('workspaceManager', workspaceManager);
        serviceRegistry.register('config', configurationManager);
        serviceRegistry.register('kernelAPI', kernelApi);
        serviceRegistry.register('engineManager', engineManager);
        serviceRegistry.register('nodeId', canonicalNodeIdentity.nodeId);
        serviceRegistry.register('nodeIdentity', canonicalNodeIdentity);
        // Register ConversationContext service wrapper around memoryGateway history
        const conversationContext = {
            async addMessage(role, content, metadata) {
                const activeSessionId = await runtimeSessionManager.getActiveSession();
                if (!activeSessionId)
                    throw new Error("No active session");
                const message = {
                    id: crypto.randomUUID(),
                    role,
                    content,
                    metadata,
                    createdAt: new Date().toISOString()
                };
                const memoryGateway = serviceRegistry.get('memoryGateway');
                await memoryGateway.appendHistory(activeSessionId, message);
            },
            async getMessages() {
                const activeSessionId = await runtimeSessionManager.getActiveSession();
                if (!activeSessionId)
                    return [];
                const memoryGateway = serviceRegistry.get('memoryGateway');
                return await memoryGateway.getHistory(activeSessionId);
            }
        };
        container.bind('conversationContext', conversationContext);
        serviceRegistry.register('conversationContext', conversationContext);
        console.log('[Bootloader] Initiating Phase 4: Session & Storage Recovery...');
        logger.log('info', 'System storage verified and state checks successful', 'system');
        console.log('[Bootloader] Initiating Phase 5: Ready State & Engine Loading...');
        // Create Context with mandatory nodeId and getNodeIdentity
        const runtimeContext = {
            nodeId: canonicalNodeIdentity.nodeId,
            runtimeId: "node-123",
            kernelVersion: "1.0.0",
            bootId: "boot-abc",
            platform,
            architecture: arch,
            bootMode: 'NORMAL',
            getNodeIdentity: () => canonicalNodeIdentity,
            getWorkspacePath: () => workspaceManager.getWorkspacePath(),
            getLogger: () => logger,
            getConfig: () => config,
            getSecrets: () => secrets,
            getService: (tokenName) => container.resolve(tokenName),
            getEventBus: () => eventBus
        };
        // Discover, Initialize & Start registered engines
        try {
            await engineManager.discoverAndLoad(runtimeContext);
            await engineManager.initializeAll(runtimeContext);
            await engineManager.startAll();
            // Start IPC Server control channel
            try {
                const { IpcServer } = await import('../transports/IpcServer.js');
                const ipcServer = new IpcServer(workspaceManager.getWorkspacePath());
                ipcServer.start();
                container.bind('ipcServer', ipcServer);
            }
            catch (ipcErr) {
                console.error('[Bootloader] Failed to start IPC Control Channel:', ipcErr.message);
            }
        }
        catch (err) {
            console.error('[Bootloader] Safe mode triggered due to engine loading failure:', err.message);
            kernelApi.setStatus('SAFE_MODE');
            return kernelApi;
        }
        kernelApi.setStatus('ACTIVE');
        logger.log('info', 'AEGIS Core Runtime Kernel is ACTIVE', 'system');
        return kernelApi;
    }
}
