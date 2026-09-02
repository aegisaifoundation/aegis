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
  IEngineIpcHost,
  activeEngines
} from '../services/index.js';
import {
  PeerRegistry,
  ConnectionManager,
  LanDiscoveryProvider,
  NetworkConfigurationManager,
  NodeTcpTransportAdapter,
  NativeTcpTransportAdapter,
  AegisMessageRouter,
  DistributedTaskManager
} from '@aegis/runtime';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const ifaceInfo = interfaces[name];
    if (ifaceInfo) {
      for (const netInfo of ifaceInfo) {
        if (netInfo.family === 'IPv4' && !netInfo.internal) {
          if (name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('wireless') || name.toLowerCase().includes('ethernet') || name.toLowerCase().includes('local area')) {
            return netInfo.address;
          }
        }
      }
    }
  }
  for (const name of Object.keys(interfaces)) {
    const ifaceInfo = interfaces[name];
    if (ifaceInfo) {
      for (const netInfo of ifaceInfo) {
        if (netInfo.family === 'IPv4' && !netInfo.internal) {
          return netInfo.address;
        }
      }
    }
  }
  return '127.0.0.1';
}

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

  public nodeId = '';
  public nodeName = 'aegis-die-node';
  public port = 9900;

  public peerRegistry!: PeerRegistry;
  public connectionManager!: ConnectionManager;
  public messageRouter!: AegisMessageRouter;
  public taskManager!: DistributedTaskManager;
  public lanDiscoveryProvider!: LanDiscoveryProvider;
  public configManager!: NetworkConfigurationManager;

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

  getNodeIdentity() {
    return this.context.getNodeIdentity();
  }

  async initialize(context: IRuntimeContext_v1): Promise<void> {
    this.context = context;
    if (!context.nodeId || context.nodeId.trim() === '') {
      throw new Error('[DistributedIntelligenceEngine] Fatal: Canonical nodeId is missing or invalid in runtime context');
    }
    this.nodeId = context.nodeId;

    const allowLoopback = process.env.NODE_ENV === 'test' || process.env.AEGIS_ALLOW_LOOPBACK === 'true';
    this.configManager = new NetworkConfigurationManager({ allowLoopback });
    this.peerRegistry = new PeerRegistry(allowLoopback);

    const tcpAdapter = new NodeTcpTransportAdapter();
    const nativeAdapter = new NativeTcpTransportAdapter(() => this.getIpcManager());

    this.connectionManager = new ConnectionManager(
      this.nodeId,
      this.nodeName,
      this.peerRegistry,
      this.configManager,
      [tcpAdapter, nativeAdapter]
    );

    this.messageRouter = new AegisMessageRouter(this.nodeId, () => this.connectionManager);
    this.connectionManager.setMessageRouter(this.messageRouter);
    this.taskManager = new DistributedTaskManager(this.nodeId, this.messageRouter, this.peerRegistry);

    this.lanDiscoveryProvider = new LanDiscoveryProvider(
      this.nodeId,
      this.nodeName,
      () => [
        { transport: 'tcp', port: this.port + 1, priority: 1 },
        { transport: 'native_tcp', port: this.port, priority: 2 }
      ]
    );

    await tcpAdapter.listen(this.port + 1);
    await this.lanDiscoveryProvider.start();

    this.lanDiscoveryProvider.onPeerDiscovered((peer) => {
      this.peerRegistry.registerPeer(peer);
    });

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
    if (config.nodeName) this.nodeName = config.nodeName;
    if (config.port) this.port = config.port;
    await this.lifecycle.configure({
      ...config,
      nodeId: this.nodeId,
      nodeName: this.nodeName
    });
    activeEngines.set(this.nodeId, this);
    activeEngines.set(this.nodeName, this);
  }

  async start(): Promise<void> {
    await this.lifecycle.start();

    // Register incoming P2P connection request handlers
    this.messagingService.onMessage('connection_request', async (payload: any, senderId: string) => {
      await this.handleIncomingConnectionRequest(payload, senderId);
    });

    this.messagingService.onMessage('connection_accepted', async (payload: any, senderId: string) => {
      await this.handleIncomingConnectionApproval(payload, senderId);
    });

    this.messagingService.onMessage('user_chat_msg', async (payload: any, senderId: string) => {
      try {
        const logDir = 'workspace/logs';
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        fs.appendFileSync('workspace/logs/chat_history.log', `[${new Date().toISOString()}] [${senderId}]: ${payload.text}\n`, 'utf8');
      } catch {}
    });
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

  async stopNetwork(): Promise<void> {
    if (this.lanDiscoveryProvider) {
      await this.lanDiscoveryProvider.stop();
    }
    if (this.connectionManager) {
      await this.connectionManager.stop();
    }
  }

  async shutdown(): Promise<void> {
    await this.stopNetwork();
    try {
      await this.lifecycle.shutdown();
    } catch (err: any) {
      console.log(`[DistributedIntelligenceEngine] Lifecycle shutdown notice: ${err.message}`);
    }
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

  private getRequestsFilePath(): string {
    const workspacePath = this.context.getWorkspacePath();
    const dotAegisPath = path.resolve(workspacePath, '../.aegis');
    if (!fs.existsSync(dotAegisPath)) {
      fs.mkdirSync(dotAegisPath, { recursive: true });
    }
    return path.join(dotAegisPath, 'connection_requests.json');
  }

  async getConnectionRequests(): Promise<any[]> {
    const filePath = this.getRequestsFilePath();
    if (!fs.existsSync(filePath)) {
      return [];
    }
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch {
      return [];
    }
  }

  private async saveConnectionRequests(requests: any[]): Promise<void> {
    const filePath = this.getRequestsFilePath();
    fs.writeFileSync(filePath, JSON.stringify(requests, null, 2), 'utf8');
  }

  async requestConnection(targetNodeId: string): Promise<void> {
    const peer = this.discoveryService.getLocalPeer(targetNodeId);
    if (!peer) {
      throw new Error(`Node "${targetNodeId}" is not registered locally. Use registerNode first.`);
    }

    const localIp = getLocalIpAddress();
    const requests = await this.getConnectionRequests();
    const requestId = crypto.randomUUID();
    const newRequest = {
      requestId,
      senderNodeId: this.nodeId || this.nodeName,
      senderHost: localIp,
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
      senderHost: localIp,
      senderPort: this.port
    });
  }

  async acceptConnectionRequest(requestId: string): Promise<void> {
    const requests = await this.getConnectionRequests();
    const req = requests.find((r: any) => r.requestId === requestId);
    if (!req) {
      throw new Error(`Connection request with ID "${requestId}" not found.`);
    }

    req.status = 'accepted';
    await this.saveConnectionRequests(requests);

    // Register peer in discoveryService
    await this.discoveryService.registerNode(req.senderNodeId, req.senderHost, req.senderPort);

    const localIp = getLocalIpAddress();
    // Send connection approval back to the sender
    await this.messagingService.sendMessage(req.senderNodeId, 'connection_accepted', {
      requestId,
      targetHost: localIp,
      targetPort: this.port
    });
  }

  async clearConnectionRequests(): Promise<void> {
    const filePath = this.getRequestsFilePath();
    if (fs.existsSync(filePath)) {
      try {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf8');
      } catch {}
    }
  }

  private async handleIncomingConnectionRequest(payload: any, senderId: string): Promise<void> {
    const requests = await this.getConnectionRequests();
    // Prevent duplicate request records
    if (requests.some((r: any) => r.requestId === payload.requestId)) {
      return;
    }
    const newRequest = {
      requestId: payload.requestId,
      senderNodeId: senderId,
      senderHost: payload.senderHost,
      senderPort: payload.senderPort,
      targetNodeId: this.nodeId || this.nodeName,
      status: 'pending',
      timestamp: new Date().toISOString()
    };
    requests.push(newRequest);
    await this.saveConnectionRequests(requests);
  }

  private async handleIncomingConnectionApproval(payload: any, senderId: string): Promise<void> {
    const requests = await this.getConnectionRequests();
    const req = requests.find((r: any) => r.requestId === payload.requestId);
    if (req) {
      req.status = 'accepted';
      await this.saveConnectionRequests(requests);
    }
    // Register the approved target node
    await this.discoveryService.registerNode(senderId, payload.targetHost, payload.targetPort);
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
