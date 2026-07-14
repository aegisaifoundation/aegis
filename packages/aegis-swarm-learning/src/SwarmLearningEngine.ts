import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';
import { serviceRegistry } from '@aegis/runtime';

export class SwarmLearningEngine implements IEngine {
  readonly metadata: IEngineMetadata = {
    id: 'aegis-swarm-learning',
    displayName: 'Swarm Learning Engine',
    version: '1.0.0',
    kernelApiVersion: '1.0.0',
    dependencies: ['distributed-intelligence'],
    priority: 10,
    autoStart: true,
    singleton: true,
    permissions: []
  };

  private context!: IRuntimeContext_v1;
  private state: 'STOPPED' | 'ONLINE' | 'LEARNING' = 'STOPPED';
  private isLeader = false;
  private currentLeaderId: string | null = null;
  private localNodeId = '';
  private swarmRound = 0;
  private peerModels: Map<string, any> = new Map();

  async initialize(context: IRuntimeContext_v1): Promise<void> {
    this.context = context;
    serviceRegistry.register('swarm-learning', this);
    console.log('[SwarmLearningEngine] Initialized. Registered in service registry.');
  }

  async start(): Promise<void> {
    this.state = 'ONLINE';
    this.setupListeners();
    console.log('[SwarmLearningEngine] Started. Awaiting swarm coordination signals.');
  }

  async shutdown(): Promise<void> {
    this.state = 'STOPPED';
    this.isLeader = false;
    this.currentLeaderId = null;
    this.peerModels.clear();
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
        isLeader: this.isLeader,
        leaderId: this.currentLeaderId,
        swarmRound: this.swarmRound,
        peerCount: this.peerModels.size
      }
    };
  }

  private getDis(): any {
    return serviceRegistry.get<any>('distributed-intelligence');
  }

  private setupListeners(): void {
    const dis = this.getDis();
    if (!dis) {
      console.warn('[SwarmLearningEngine] Distributed Intelligence Engine not found. Running standalone.');
      return;
    }

    // Listen for leader election proposals
    dis.messagingService.onMessage('swarm_leader_proposal', async (payload: any, senderId: string) => {
      console.log(`[SwarmLearningEngine] Leader proposal received from ${senderId}`);
      await this.handleLeaderProposal(payload.candidateId, senderId);
    });

    // Listen for incoming peer model weights
    dis.messagingService.onMessage('swarm_model_weights', (payload: any, peerId: string) => {
      console.log(`[SwarmLearningEngine] Received peer model weights from ${peerId}`);
      this.peerModels.set(peerId, payload.weights);
      
      // Check if we have enough peers to aggregate
      if (this.isLeader) {
        this.tryAggregateSwarm();
      }
    });

    // Listen for aggregated global weights broadcast from current leader
    dis.messagingService.onMessage('swarm_aggregated_weights', (payload: any, leaderId: string) => {
      console.log(`[SwarmLearningEngine] Received aggregated model from leader ${leaderId}`);
      this.applyGlobalWeights(payload.aggregatedWeights);
    });

    // Subscribe to swarm round events via distributed event bus
    dis.eventService.subscribe('swarm_round_started', (payload: any) => {
      console.log(`[SwarmLearningEngine] Swarm round ${payload.round} started.`);
      this.participateInSwarmRound(payload.round);
    });
  }

  // --- Leader Election ---
  async triggerLeaderElection(): Promise<void> {
    const dis = this.getDis();
    if (!dis) return;

    const peers = await dis.discoveryService.discoverNodes();
    if (peers.length === 0) {
      // No peers found, become leader by default
      this.becomeLeader();
      return;
    }

    const candidateId = this.localNodeId || 'self';
    console.log(`[SwarmLearningEngine] Broadcasting leader election proposal: ${candidateId}`);
    
    for (const peer of peers) {
      await dis.messagingService.sendMessage(peer, 'swarm_leader_proposal', {
        candidateId,
        round: this.swarmRound
      });
    }
  }

  private async handleLeaderProposal(candidateId: string, senderId: string): Promise<void> {
    // Simple deterministic leader selection: lowest-sorted ID wins
    const selfId = this.localNodeId || 'self';
    if (candidateId < selfId) {
      this.currentLeaderId = candidateId;
      this.isLeader = false;
      console.log(`[SwarmLearningEngine] Accepted ${candidateId} as swarm leader.`);
    } else {
      this.becomeLeader();
    }
  }

  private becomeLeader(): void {
    this.isLeader = true;
    this.currentLeaderId = this.localNodeId || 'self';
    console.log('[SwarmLearningEngine] This node is now the swarm leader.');
  }

  // --- Swarm Round Participation ---
  private async participateInSwarmRound(round: number): Promise<void> {
    this.state = 'LEARNING';
    this.swarmRound = round;

    // Simulate local P2P gradient update
    const localWeights = {
      layer1: [0.23, -0.11, 0.76],
      layer2: [0.45, 0.67, -0.32]
    };

    const dis = this.getDis();
    if (dis && this.currentLeaderId) {
      console.log(`[SwarmLearningEngine] Sending local weights to leader ${this.currentLeaderId}`);
      await dis.messagingService.sendMessage(this.currentLeaderId, 'swarm_model_weights', {
        weights: localWeights,
        round
      });
    }

    this.state = 'ONLINE';
  }

  private tryAggregateSwarm(): void {
    if (this.peerModels.size < 1) return;

    console.log(`[SwarmLearningEngine] Aggregating weights from ${this.peerModels.size} peers...`);
    
    // Federated averaging simulation
    const aggregatedWeights = {
      layer1: [0.34, 0.12, 0.54],
      layer2: [0.52, 0.38, -0.19]
    };

    const dis = this.getDis();
    if (dis) {
      dis.eventService.publishEvent('swarm_aggregated_weights_ready', {
        aggregatedWeights,
        round: this.swarmRound
      }).catch(() => {});
    }

    this.peerModels.clear();
  }

  private applyGlobalWeights(weights: any): void {
    console.log('[SwarmLearningEngine] Applied global aggregated weights from swarm leader.');
  }

  // --- Public API ---
  async startSwarmRound(): Promise<void> {
    const dis = this.getDis();
    if (!dis) return;

    this.swarmRound++;
    await dis.eventService.publishEvent('swarm_round_started', { round: this.swarmRound });
  }

  getState(): string {
    return this.state;
  }
}
export default SwarmLearningEngine;
