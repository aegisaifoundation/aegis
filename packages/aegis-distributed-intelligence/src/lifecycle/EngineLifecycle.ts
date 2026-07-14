import { EventEmitter } from 'events';
import { IRuntimeContext_v1 } from '@aegis/sdk';
import { ProcessSupervisor } from './ProcessSupervisor.js';
import { ShutdownManager } from './ShutdownManager.js';
import { RestartManager } from './RestartManager.js';
import { EngineStateMachine } from '../state/EngineStateMachine.js';
import { EngineState } from '../state/EngineState.js';
import { IPCManager, StdioTransport } from '../ipc/IPCManager.js';
import { MessageType } from '../ipc/MessageTypes.js';
import { Packet } from '../ipc/Packet.js';
import { DiagnosticsManager } from '../diagnostics/DiagnosticsManager.js';
import { MetricsCollector } from '../monitoring/MetricsCollector.js';
import { HealthMonitor } from '../monitoring/HealthMonitor.js';
import { ConfigurationManager } from '../configuration/ConfigurationManager.js';
import { CapabilityManager } from '../capabilities/CapabilityManager.js';
import { ProtocolNegotiator } from '../protocol/ProtocolNegotiator.js';
import { EventTranslator } from '../events/EventTranslator.js';
import { NativeLogger } from '../logging/NativeLogger.js';
import { RuntimeEvents } from '../events/RuntimeEvents.js';
import path from 'path';

export class EngineLifecycle extends EventEmitter {
  private supervisor = new ProcessSupervisor();
  private stateMachine = new EngineStateMachine();
  private restartManager = new RestartManager();
  private ipcManager = new IPCManager();
  private diagnostics = new DiagnosticsManager();
  private metrics = new MetricsCollector();
  private configManager = new ConfigurationManager();
  private capabilities = new CapabilityManager();
  private logger = new NativeLogger();
  private negotiator = new ProtocolNegotiator(this.ipcManager);
  
  private healthMonitor!: HealthMonitor;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isLegacyMode = true; // Default to legacy mode for backward-compatibility
  private executablePath = '';
  private startedAt: Date | null = null;

  constructor() {
    super();
    this.healthMonitor = new HealthMonitor(this.stateMachine, this.restartManager, this.metrics);
    this.setupListeners();
  }

  getStateMachine(): EngineStateMachine { return this.stateMachine; }
  getRestartManager(): RestartManager { return this.restartManager; }
  getMetricsCollector(): MetricsCollector { return this.metrics; }
  getDiagnosticsManager(): DiagnosticsManager { return this.diagnostics; }
  getCapabilityManager(): CapabilityManager { return this.capabilities; }
  getConfigurationManager(): ConfigurationManager { return this.configManager; }
  getHealthMonitor(): HealthMonitor { return this.healthMonitor; }
  getLogger(): NativeLogger { return this.logger; }
  getSupervisor(): ProcessSupervisor { return this.supervisor; }
  getIpcManager(): IPCManager { return this.ipcManager; }
  getStartedAt(): Date | null { return this.startedAt; }
  getUptimeMs(): number { return this.metrics.getUptimeMs(); }
  getRestartCount(): number { return this.restartManager.getRestartCount(); }
  async pause(): Promise<void> {}
  async resume(): Promise<void> {}

  private setupListeners(): void {
    // Forward state transitions to our internal emitter
    this.stateMachine.onTransition((state, previous) => {
      this.logger.info(`Engine transition: ${previous} -> ${state}`);
      this.emit('state', state, previous);

      // Map transitions to RuntimeEvents
      if (state === EngineState.STARTING) {
        this.emit(RuntimeEvents.ENGINE_STARTING);
      } else if (state === EngineState.ONLINE) {
        this.emit(RuntimeEvents.ENGINE_READY);
      } else if (state === EngineState.FAILED) {
        this.emit(RuntimeEvents.ENGINE_FAILED);
      } else if (state === EngineState.STOPPED) {
        this.emit(RuntimeEvents.ENGINE_SHUTDOWN);
      } else if (state === EngineState.RECOVERING) {
        this.emit(RuntimeEvents.ENGINE_RESTARTING);
      }
    });

    // Handle supervisor exit
    this.supervisor.on('exit', (code, signal) => {
      this.logger.warn(`Process exited with code ${code}, signal ${signal}`);
      this.emit(RuntimeEvents.ENGINE_CRASHED, { code, signal });
      this.diagnostics.getCrashReporter().recordCrash(code, signal);
      this.metrics.stop();
      this.stopHeartbeat();

      if (this.stateMachine.getState() === EngineState.STOPPING) {
        this.stateMachine.transitionTo(EngineState.STOPPED);
        return;
      }

      this.stateMachine.transitionTo(EngineState.FAILED);
      this.handleCrash();
    });

    this.supervisor.on('error', (err) => {
      this.logger.error(`Process supervisor error: ${err.message}`);
      this.emit('error', err);
    });

    // Handle IPC packets
    this.ipcManager.on('packet', (packet: Packet) => {
      this.metrics.recordMessage(JSON.stringify(packet).length);
      
      // Handle heartbeats/pings
      if (packet.messageType === MessageType.PING) {
        this.ipcManager.send(MessageType.PONG, { correlationId: packet.messageId }).catch(() => {});
      } else if (packet.messageType === MessageType.PONG) {
        this.healthMonitor.recordHeartbeat();
      } else if (packet.messageType === MessageType.LOG || packet.messageType === MessageType.ERROR || packet.messageType === MessageType.WARNING) {
        const level = (packet.payload.level || 'INFO').toLowerCase();
        const msg = packet.payload.message || '';
        if (level === 'error') {
          this.logger.error(`[Native] ${msg}`);
        } else if (level === 'warn') {
          this.logger.warn(`[Native] ${msg}`);
        } else {
          this.logger.info(`[Native] ${msg}`);
        }
      } else if (packet.messageType === MessageType.EVENT) {
        const translated = EventTranslator.translate(packet);
        if (translated) {
          this.emit('runtimeEvent', translated.eventName, translated.payload);
        }
      }
    });
  }

  async initialize(context: IRuntimeContext_v1, executablePath: string): Promise<void> {
    this.logger.setContext(context);
    this.executablePath = executablePath;
    this.stateMachine.transitionTo(EngineState.INITIALIZING);
    this.logger.info(`Lifecycle initialized. Executable path set to: ${this.executablePath}`);
  }

  async configure(config: Record<string, any>): Promise<void> {
    this.configManager.load(config);
    this.logger.info('Lifecycle configured successfully.');
  }

  async start(): Promise<void> {
    const currentState = this.stateMachine.getState();
    if (currentState === EngineState.ONLINE || currentState === EngineState.STARTING) {
      this.logger.warn(`Cannot start engine, current state is ${currentState}`);
      return;
    }

    this.stateMachine.transitionTo(EngineState.STARTING);
    this.restartManager.reset();
    await this.launch();
  }

  private async launch(): Promise<void> {
    const config = this.configManager.get();
    const args = this.configManager.buildCliArgs();

    try {
      this.logger.info(`Spawning native process with args: ${args.join(' ')}`);
      
      const transport = new StdioTransport();
      const cp = this.supervisor.spawn(this.executablePath, args);
      transport.setProcess(cp);
      this.ipcManager.setTransport(transport);
      await this.ipcManager.getTransport()?.connect();

      this.metrics.start();

      // Wait for READY packet or timeout
      await this.waitForReady(config.startupTimeoutMs || 15000);

      // READY packet received! Transition to HANDSHAKING
      this.stateMachine.transitionTo(EngineState.HANDSHAKING);
      
      const handshakePassed = await this.negotiator.negotiate(this.isLegacyMode);
      if (!handshakePassed) {
        throw new Error('Protocol version handshake negotiation failed');
      }

      this.stateMachine.transitionTo(EngineState.LOADING);
      // Retrieve capabilities if not legacy
      if (!this.isLegacyMode) {
        try {
          const caps = await this.ipcManager.request(MessageType.CAPABILITIES, {}, 2000);
          this.capabilities.registerCapabilities(caps);
        } catch (e: any) {
          this.logger.warn(`Failed to retrieve capabilities from C++ engine: ${e.message}`);
        }
      }

      this.stateMachine.transitionTo(EngineState.READY);
      this.startedAt = new Date();
      this.stateMachine.transitionTo(EngineState.ONLINE);
      this.startHeartbeat();
      this.logger.info('Engine launched successfully and marked ONLINE.');
    } catch (err: any) {
      this.logger.error(`Launch failed: ${err.message}`);
      this.stateMachine.transitionTo(EngineState.FAILED);
      this.handleCrash();
      throw err;
    }
  }

  private waitForReady(timeoutMs: number): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          reject(new Error(`Startup timed out waiting for ready signal after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      const onPacket = (packet: Packet) => {
        if (packet.messageType === MessageType.READY) {
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            cleanup();
            resolve();
          }
        }
      };

      const onError = (err: Error) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          cleanup();
          reject(err);
        }
      };

      const onClose = (code: number, signal: string) => {
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          cleanup();
          reject(new Error(`Process exited before ready signal (code=${code}, signal=${signal})`));
        }
      };

      const cleanup = () => {
        this.ipcManager.off('packet', onPacket);
        this.ipcManager.off('error', onError);
        this.ipcManager.off('close', onClose);
      };

      this.ipcManager.on('packet', onPacket);
      this.ipcManager.on('error', onError);
      this.ipcManager.on('close', onClose);
    });
  }

  private handleCrash(): void {
    if (this.restartManager.canRestart()) {
      const delay = this.restartManager.recordRestart();
      this.stateMachine.transitionTo(EngineState.RECOVERING);
      this.logger.warn(`Scheduling restart attempt ${this.restartManager.getRestartCount()} in ${delay}ms...`);
      
      setTimeout(() => {
        if (this.stateMachine.getState() === EngineState.RECOVERING) {
          this.launch().catch(() => {
            // Error logged by launch, handleCrash continues retry cycle
          });
        }
      }, delay);
    } else {
      this.logger.error(`Max restart attempts reached. Engine remains FAILED.`);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    const config = this.configManager.get();
    const interval = config.heartbeatIntervalMs || 10000;

    this.heartbeatInterval = setInterval(async () => {
      if (this.stateMachine.getState() !== EngineState.ONLINE) return;

      if (!this.isLegacyMode) {
        try {
          const t0 = Date.now();
          await this.ipcManager.request(MessageType.PING, {}, 2000);
          this.metrics.recordLatency(Date.now() - t0);
          this.healthMonitor.recordHeartbeat();
        } catch (err) {
          this.healthMonitor.recordMissedHeartbeat();
          this.logger.warn('Heartbeat check failed.');
        }
      } else {
        // In legacy mode, ping is not supported, simulate heartbeat to keep monitor healthy
        this.healthMonitor.recordHeartbeat();
      }

      this.emit('metrics', this.metrics.getMetricsSummary());
      this.emit('health', this.healthMonitor.getHealthReport());
    }, interval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  async shutdown(): Promise<void> {
    const state = this.stateMachine.getState();
    if (state === EngineState.STOPPED || state === EngineState.UNINITIALIZED) return;

    this.logger.info('Shutting down engine...');
    this.stateMachine.transitionTo(EngineState.STOPPING);
    this.stopHeartbeat();

    // Prevent auto-restarting during shutdown
    this.restartManager.reset();

    const cp = this.supervisor.getChildProcess();
    await ShutdownManager.terminate(cp);
    await this.ipcManager.shutdown();

    this.stateMachine.transitionTo(EngineState.STOPPED);
    this.logger.info('Engine shut down successfully.');
  }

  async reload(): Promise<void> {
    this.logger.info('Reloading engine lifecycle host...');
    await this.shutdown();
    await this.start();
  }

  async dispose(): Promise<void> {
    await this.shutdown();
    this.removeAllListeners();
  }
}
export default EngineLifecycle;
