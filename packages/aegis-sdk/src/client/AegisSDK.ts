import crypto from 'crypto';
import { ITransportClient, SyscallMessage, SyscallResponse } from '../types/syscall.js';
import { mapErrorCodeToException, AegisError, FeatureUnavailable } from '../errors/SdkErrors.js';
import { serviceRegistry } from '@aegis/runtime';

// ==========================================
// MOCK TRANSPORT
// ==========================================
export class MockTransport implements ITransportClient {
  private connected = false;
  private listeners = new Map<string, Set<(payload: any) => void>>();

  async connect(options: { endpoint: string; apiKey?: string }): Promise<void> {
    this.connected = true;
    console.log(`[MockTransport] Connected to ${options.endpoint}`);
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async send(message: SyscallMessage): Promise<SyscallResponse> {
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

  async subscribe(event: string, callback: (payload: any) => void): Promise<string> {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return `mock-sub-${crypto.randomUUID()}`;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {}
}

// ==========================================
// LOOPBACK TRANSPORT (routes direct to microkernel container)
// ==========================================
export class LoopbackTransport implements ITransportClient {
  private connected = false;
  private listeners = new Map<string, Set<(payload: any) => void>>();

  async connect(): Promise<void> {
    this.connected = true;
    console.log(`[LoopbackTransport] Loopback initialized.`);
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async send(message: SyscallMessage): Promise<SyscallResponse> {
    if (!this.connected) {
      return { success: false, error: { code: 'RuntimeUnavailable', message: 'Loopback transport disconnected.' } };
    }

    // Dynamic routing to microkernel serviceRegistry components
    try {
      if (message.category === 'Runtime') {
        if (message.method === 'Version') return { success: true, result: '1.0.0' };
        if (message.method === 'RuntimeHealth') return { success: true, result: { status: 'HEALTHY' } };
      }

      if (message.category === 'AI Runtime') {
        // Find distributed inference engine or unified platform
        if (serviceRegistry.has('aegis-distributed-inference')) {
          const inf = serviceRegistry.get<any>('aegis-distributed-inference');
          if (message.method === 'Generate') {
            const res = await inf.generate?.(message.params.prompt);
            return { success: true, result: res || { text: 'Inference completed' } };
          }
        }
      }

      if (message.category === 'Dataset') {
        if (serviceRegistry.has('aegis-data')) {
          const data = serviceRegistry.get<any>('aegis-data');
          if (message.method === 'CreateDataset') {
            const meta = await data.DatasetMetadata?.();
            return { success: true, result: { id: message.params.id, ...meta } };
          }
        }
      }

      if (message.category === 'Training') {
        if (serviceRegistry.has('aegis-training-engine:scheduler')) {
          const ate = serviceRegistry.get<any>('aegis-training-engine:scheduler');
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

    } catch (err: any) {
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

  async subscribe(event: string, callback: (payload: any) => void): Promise<string> {
    if (serviceRegistry.has('eventBus')) {
      const bus = serviceRegistry.get<any>('eventBus');
      bus.on(event, callback);
    }
    return `loopback-sub-${crypto.randomUUID()}`;
  }

  async unsubscribe(subscriptionId: string): Promise<void> {}
}

// ==========================================
// AEGIS SDK CLASS
// ==========================================
export class AegisSDK {
  private transport: ITransportClient;
  private apiKey?: string;
  private correlationId = `corr-${crypto.randomUUID()}`;
  private sessionId = `sess-${crypto.randomUUID()}`;
  private userId = 'user-default';

  constructor(transport: ITransportClient) {
    this.transport = transport;
  }

  static async initialize(options: {
    endpoint?: string;
    apiKey?: string;
    transport?: 'mock' | 'loopback' | 'ipc';
  } = {}): Promise<AegisSDK> {
    let client: ITransportClient;
    if (options.transport === 'mock') {
      client = new MockTransport();
    } else {
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

  async shutdown(): Promise<void> {
    await this.transport.disconnect();
  }

  setSession(sessionId: string, userId?: string) {
    this.sessionId = sessionId;
    if (userId) this.userId = userId;
  }

  // System call executor
  private async syscall<T = any>(category: string, method: string, params: any = {}): Promise<T> {
    const msg: SyscallMessage = {
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
    return res.result as T;
  }

  // ==========================================
  // SYSTEM CALLS: RUNTIME
  // ==========================================
  async version(): Promise<string> {
    return this.syscall<string>('Runtime', 'Version');
  }

  async platformInfo(): Promise<any> {
    return this.syscall('Runtime', 'PlatformInfo');
  }

  async runtimeHealth(): Promise<any> {
    return this.syscall('Runtime', 'RuntimeHealth');
  }

  // ==========================================
  // SYSTEM CALLS: NODE
  // ==========================================
  async nodeInfo(): Promise<any> {
    return this.syscall('Node', 'NodeInfo');
  }

  // ==========================================
  // SYSTEM CALLS: PACKAGES
  // ==========================================
  async installPackage(packageId: string): Promise<any> {
    return this.syscall('Packages', 'InstallPackage', { packageId });
  }

  // ==========================================
  // SYSTEM CALLS: DATASET
  // ==========================================
  async createDataset(id: string, path: string): Promise<any> {
    return this.syscall('Dataset', 'CreateDataset', { id, path });
  }

  // ==========================================
  // SYSTEM CALLS: TRAINING
  // ==========================================
  async createTrainingJob(jobId: string, datasetId: string): Promise<any> {
    return this.syscall('Training', 'CreateTrainingJob', { jobId, datasetId });
  }

  async exportLoRA(jobId: string): Promise<any> {
    return this.syscall('Training', 'ExportLoRA', { jobId });
  }

  // ==========================================
  // SYSTEM CALLS: FEDERATED LEARNING
  // ==========================================
  async createLearningRound(roundId: string): Promise<any> {
    return this.syscall('Federated Learning', 'CreateLearningRound', { roundId });
  }

  // ==========================================
  // SYSTEM CALLS: SWARM LEARNING
  // ==========================================
  async createSwarm(swarmId: string): Promise<any> {
    return this.syscall('Swarm Learning', 'CreateSwarm', { swarmId });
  }

  // ==========================================
  // SYSTEM CALLS: AI RUNTIME
  // ==========================================
  async generate(prompt: string, options: any = {}): Promise<any> {
    return this.syscall('AI Runtime', 'Generate', { prompt, options });
  }

  // ==========================================
  // SYSTEM CALLS: COLLABORATION
  // ==========================================
  async discoverNodes(): Promise<any> {
    return this.syscall('Collaboration', 'DiscoverNodes');
  }

  // ==========================================
  // SYSTEM CALLS: COLLECTIVE INTELLIGENCE
  // ==========================================
  async publishKnowledge(key: string, content: any): Promise<any> {
    return this.syscall('Collective Intelligence', 'PublishKnowledge', { key, content });
  }

  // ==========================================
  // SYSTEM CALLS: MEMORY
  // ==========================================
  async storeMemory(key: string, value: any): Promise<any> {
    return this.syscall('Memory', 'StoreMemory', { key, value });
  }

  // ==========================================
  // SYSTEM CALLS: EVENTS
  // ==========================================
  async subscribe(event: string, callback: (payload: any) => void): Promise<string> {
    return this.transport.subscribe(event, callback);
  }
}
