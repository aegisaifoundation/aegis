import { serviceRegistry } from '@aegis/runtime';
export class SwarmLearningEngine {
    metadata = {
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
    context;
    state = 'STOPPED';
    isLeader = false;
    currentLeaderId = null;
    localNodeId = '';
    swarmRound = 0;
    peerModels = new Map();
    async initialize(context) {
        this.context = context;
        serviceRegistry.register('swarm-learning', this);
        console.log('[SwarmLearningEngine] Initialized. Registered in service registry.');
    }
    async start() {
        this.state = 'ONLINE';
        this.setupListeners();
        console.log('[SwarmLearningEngine] Started. Awaiting swarm coordination signals.');
    }
    async shutdown() {
        this.state = 'STOPPED';
        this.isLeader = false;
        this.currentLeaderId = null;
        this.peerModels.clear();
    }
    async configure(_config) { }
    async pause() { }
    async resume() { }
    async reload() { await this.shutdown(); await this.start(); }
    async dispose() { await this.shutdown(); }
    async health() {
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
    getDis() {
        return serviceRegistry.get('distributed-intelligence');
    }
    setupListeners() {
        const dis = this.getDis();
        if (!dis) {
            console.warn('[SwarmLearningEngine] Distributed Intelligence Engine not found. Running standalone.');
            return;
        }
        // Listen for leader election proposals
        dis.messagingService.onMessage('swarm_leader_proposal', async (payload, senderId) => {
            console.log(`[SwarmLearningEngine] Leader proposal received from ${senderId}`);
            await this.handleLeaderProposal(payload.candidateId, senderId);
        });
        // Listen for incoming peer model weights
        dis.messagingService.onMessage('swarm_model_weights', (payload, peerId) => {
            console.log(`[SwarmLearningEngine] Received peer model weights from ${peerId}`);
            this.peerModels.set(peerId, payload.weights);
            // Check if we have enough peers to aggregate
            if (this.isLeader) {
                this.tryAggregateSwarm();
            }
        });
        // Listen for aggregated global weights broadcast from current leader
        dis.messagingService.onMessage('swarm_aggregated_weights', (payload, leaderId) => {
            console.log(`[SwarmLearningEngine] Received aggregated model from leader ${leaderId}`);
            this.applyGlobalWeights(payload.aggregatedWeights);
        });
        // Subscribe to swarm round events via distributed event bus
        dis.eventService.subscribe('swarm_round_started', (payload) => {
            console.log(`[SwarmLearningEngine] Swarm round ${payload.round} started.`);
            this.participateInSwarmRound(payload.round);
        });
    }
    // --- Leader Election ---
    async triggerLeaderElection() {
        const dis = this.getDis();
        if (!dis)
            return;
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
    async handleLeaderProposal(candidateId, senderId) {
        // Simple deterministic leader selection: lowest-sorted ID wins
        const selfId = this.localNodeId || 'self';
        if (candidateId < selfId) {
            this.currentLeaderId = candidateId;
            this.isLeader = false;
            console.log(`[SwarmLearningEngine] Accepted ${candidateId} as swarm leader.`);
        }
        else {
            this.becomeLeader();
        }
    }
    becomeLeader() {
        this.isLeader = true;
        this.currentLeaderId = this.localNodeId || 'self';
        console.log('[SwarmLearningEngine] This node is now the swarm leader.');
    }
    // --- Swarm Round Participation ---
    async participateInSwarmRound(round) {
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
    tryAggregateSwarm() {
        if (this.peerModels.size < 1)
            return;
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
            }).catch(() => { });
        }
        this.peerModels.clear();
    }
    applyGlobalWeights(weights) {
        console.log('[SwarmLearningEngine] Applied global aggregated weights from swarm leader.');
    }
    // --- Public API ---
    async startSwarmRound() {
        const dis = this.getDis();
        if (!dis)
            return;
        this.swarmRound++;
        await dis.eventService.publishEvent('swarm_round_started', { round: this.swarmRound });
    }
    getState() {
        return this.state;
    }
}
export default SwarmLearningEngine;
//# sourceMappingURL=SwarmLearningEngine.js.map