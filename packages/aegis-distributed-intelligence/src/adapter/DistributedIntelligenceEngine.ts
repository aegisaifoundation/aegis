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
import net from 'net';
import { MessageType } from '../ipc/MessageTypes.js';

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
  private tcpServer: net.Server | null = null;

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
              } catch {}
            }
          } else {
            break;
          }
        }
      });

      socket.on('error', () => {});
    });

    this.tcpServer.listen(port, host, () => {
      console.log(`[DistributedIntelligenceEngine] P2P TCP Server listening on ${host}:${port}`);
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

  async shutdown(): Promise<void> {
    if (this.tcpServer) {
      this.tcpServer.close();
      this.tcpServer = null;
    }
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
