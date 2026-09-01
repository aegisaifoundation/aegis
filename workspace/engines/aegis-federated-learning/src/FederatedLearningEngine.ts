import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';
import { serviceRegistry } from '@aegis/runtime';

export class FederatedLearningEngine implements IEngine {
  readonly metadata: IEngineMetadata = {
    id: 'aegis-federated-learning',
    displayName: 'Federated Learning Engine',
    version: '1.0.0',
    kernelApiVersion: '1.0.0',
    dependencies: ['distributed-intelligence'],
    priority: 10,
    autoStart: true,
    singleton: true,
    permissions: []
  };

  private context!: IRuntimeContext_v1;
  private localNodeId = '';
  private state: 'STOPPED' | 'ONLINE' | 'TRAINING' = 'STOPPED';
  private currentRound = 0;
  private activeModelVersion = 'v1.0.0';
  private trainingMetrics = { accuracy: 0.85, loss: 0.32 };

  async initialize(context: IRuntimeContext_v1): Promise<void> {
    this.context = context;
    if (!context.nodeId || context.nodeId.trim() === '') {
      throw new Error('[FederatedLearningEngine] Fatal: Canonical nodeId is missing or invalid in runtime context');
    }
    this.localNodeId = context.nodeId;
    this.state = 'ONLINE';
    
    // Register ourselves in service registry for downstream AI clients
    serviceRegistry.register('federated-learning', this);
  }

  async start(): Promise<void> {
    this.state = 'ONLINE';
    this.setupListeners();
    console.log('[FederatedLearningEngine] Started and listening for rounds.');
  }

  async shutdown(): Promise<void> {
    this.state = 'STOPPED';
  }

  async configure(_config: Record<string, any>): Promise<void> {}
  async pause(): Promise<void> {}
  async resume(): Promise<void> {}
  async reload(): Promise<void> { await this.shutdown(); await this.start(); }
  async dispose(): Promise<void> { await this.shutdown(); }

  async health(): Promise<EngineHealthReport> {
    return {
      status: 'HEALTHY',
      latencyMs: 0,
      details: {
        round: this.currentRound,
        model: this.activeModelVersion,
        metrics: this.trainingMetrics
      }
    };
  }

  // --- Reusable P2P Network Service Handlers ---
  private setupListeners(): void {
    const dis = serviceRegistry.get<any>('distributed-intelligence');
    if (!dis) {
      console.warn('[FederatedLearningEngine] Distributed Intelligence Engine not found. Running standalone.');
      return;
    }

    // Register P2P round coordination messaging callbacks
    dis.messagingService.onMessage('federated_round_start', async (payload: any, coordinatorId: string) => {
      console.log(`[FederatedLearningEngine] Received training round start invitation from ${coordinatorId}`);
      await this.runLocalTrainingRound(payload.roundId, payload.globalWeights, coordinatorId);
    });

    dis.messagingService.onMessage('federated_model_update', (payload: any, peerId: string) => {
      console.log(`[FederatedLearningEngine] Received secure model update chunk from peer node: ${peerId}`);
    });
  }

  async runLocalTrainingRound(roundId: string, globalWeights: any, coordinatorId: string): Promise<void> {
    this.state = 'TRAINING';
    this.currentRound++;
    
    console.log(`[FederatedLearningEngine] Executing local epoch cycles for round ${roundId}...`);
    
    // Simulate local model update & aggregation weights
    const localWeights = { delta: [0.12, -0.05, 0.99] };
    this.trainingMetrics.accuracy += 0.01;
    this.trainingMetrics.loss -= 0.008;

    const dis = serviceRegistry.get<any>('distributed-intelligence');
    if (dis) {
      console.log(`[FederatedLearningEngine] Sending encrypted local model update to coordinator ${coordinatorId}...`);
      await dis.messagingService.sendMessage(coordinatorId, 'federated_round_weights', {
        roundId,
        localWeights,
        metrics: this.trainingMetrics
      });
    }

    this.state = 'ONLINE';
  }

  async triggerGlobalModelSync(): Promise<void> {
    const dis = serviceRegistry.get<any>('distributed-intelligence');
    if (!dis) return;

    const peers = await dis.discoveryService.discoverNodes();
    console.log(`[FederatedLearningEngine] Advertising global model sync round to ${peers.length} peers...`);
    
    for (const peer of peers) {
      await dis.messagingService.sendMessage(peer, 'federated_round_start', {
        roundId: `round-${this.currentRound + 1}`,
        globalWeights: { version: this.activeModelVersion }
      });
    }
  }

  // --- LoRA/Model API ---
  exportLoRAWeights(): string {
    return JSON.stringify({ format: 'gguf-lora-v1', weights: [0.21, 0.45], version: this.activeModelVersion });
  }

  getState(): string {
    return this.state;
  }
}
export default FederatedLearningEngine;
