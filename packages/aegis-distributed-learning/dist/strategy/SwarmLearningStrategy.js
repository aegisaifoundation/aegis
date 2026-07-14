/**
 * SwarmLearningStrategy
 *
 * Implements decentralised swarm-based learning:
 *   1. All peers are equal — no fixed coordinator
 *   2. Leader is elected dynamically per round (lowest node-ID wins)
 *   3. Every node contributes gradients and receives aggregated output
 *   4. Validation is majority-consensus based
 *
 * Zero transport code. All P2P via IStrategyContext.dis.
 */
export class SwarmLearningStrategy {
    name = 'swarm';
    context;
    peerWeights = new Map();
    electedLeaderId = null;
    leaderAcks = new Set();
    async initialize(context) {
        this.context = context;
        this._registerSwarmListeners();
        console.log('[SwarmStrategy] Initialized. Peer listeners active.');
    }
    async prepareRound(round) {
        console.log(`[SwarmStrategy] Preparing swarm round ${round.roundNumber}...`);
        this.peerWeights.clear();
        this.leaderAcks.clear();
        this.electedLeaderId = null;
        // Elect leader: broadcast candidacy, lowest ID wins
        await this._electLeader(round);
        round.leaderId = this.electedLeaderId ?? this.context.localNodeId;
        console.log(`[SwarmStrategy] Elected leader for round ${round.roundNumber}: ${round.leaderId}`);
    }
    async selectParticipants(candidates) {
        const dis = this.context.dis;
        if (!dis || candidates.length === 0)
            return [];
        // In swarm mode, all discovered peers are eligible — filter only for capability
        const eligible = [];
        for (const nodeId of candidates) {
            try {
                const caps = await dis.capabilityService.getRemoteCapabilities(nodeId);
                if (caps.includes('swarm_learning') || caps.includes('distributed_learning')) {
                    eligible.push(nodeId);
                }
            }
            catch {
                // Node unreachable — skip
            }
        }
        console.log(`[SwarmStrategy] ${eligible.length} swarm participants selected.`);
        return eligible;
    }
    async exchangeUpdates(round) {
        const dis = this.context.dis;
        if (!dis) {
            console.log('[SwarmStrategy] Standalone mode — skipping P2P gradient exchange.');
            return;
        }
        const localWeights = this.context.loraManager.getLatestAdapterWeights();
        console.log(`[SwarmStrategy] Broadcasting local gradients to ${round.participants.length - 1} peers...`);
        for (const peerId of round.participants) {
            if (peerId === this.context.localNodeId)
                continue;
            await dis.messagingService.sendMessage(peerId, 'swarm_gradient_share', {
                roundId: round.roundId,
                roundNumber: round.roundNumber,
                senderId: this.context.localNodeId,
                weights: localWeights
            });
        }
        // Await peer gradients
        await this._awaitPeerGradients(round.participants.length - 1, round.deadline);
    }
    async aggregate(round) {
        console.log(`[SwarmStrategy] Running distributed aggregation over ${this.peerWeights.size} peer updates...`);
        const weightSets = [
            this.context.loraManager.getLatestAdapterWeights(),
            ...Array.from(this.peerWeights.values())
        ];
        const contributors = [
            this.context.localNodeId,
            ...Array.from(this.peerWeights.keys())
        ];
        return this.context.aggregationManager.aggregateWeights(round.roundId, round.roundNumber, weightSets, contributors);
    }
    async validate(result) {
        // Majority consensus: accept if > 50% of participants contributed
        const expectedMin = Math.ceil((this.peerWeights.size + 1) / 2);
        const valid = result.contributors.length >= expectedMin;
        if (!valid) {
            console.warn(`[SwarmStrategy] Consensus failed: ${result.contributors.length}/${this.peerWeights.size + 1} contributors (need ${expectedMin}).`);
        }
        else {
            console.log(`[SwarmStrategy] Majority consensus achieved: ${result.contributors.length} contributors.`);
        }
        return valid;
    }
    async publishModel(result) {
        const dis = this.context.dis;
        if (!dis)
            return;
        // Broadcast to the entire swarm — leader pushes, others pull via event
        await dis.eventService.publishEvent('swarm_model_published', {
            roundId: result.roundId,
            roundNumber: result.roundNumber,
            resultHash: result.resultHash,
            leaderId: this.electedLeaderId ?? this.context.localNodeId
        });
        console.log('[SwarmStrategy] Global swarm model published.');
    }
    async finishRound(round) {
        await this.context.checkpointManager.saveRoundCheckpoint(round);
        this.peerWeights.clear();
        this.electedLeaderId = null;
        console.log(`[SwarmStrategy] Swarm round ${round.roundNumber} finalised.`);
    }
    async shutdown() {
        this.peerWeights.clear();
        this.leaderAcks.clear();
        this.electedLeaderId = null;
        console.log('[SwarmStrategy] Shutdown complete.');
    }
    // ── Private Helpers ──────────────────────────────────────────────────────
    _registerSwarmListeners() {
        const dis = this.context.dis;
        if (!dis)
            return;
        dis.messagingService.onMessage('swarm_gradient_share', (payload, senderId) => {
            this.peerWeights.set(senderId, payload.weights);
        });
        dis.messagingService.onMessage('swarm_leader_ack', (_payload, senderId) => {
            this.leaderAcks.add(senderId);
        });
    }
    /** Deterministic leader election: lowest sorted node ID wins */
    async _electLeader(round) {
        const dis = this.context.dis;
        if (!dis) {
            this.electedLeaderId = this.context.localNodeId;
            return;
        }
        const allIds = [this.context.localNodeId, ...round.participants].sort();
        this.electedLeaderId = allIds[0] ?? this.context.localNodeId;
        // Notify peers of the elected leader
        for (const peerId of round.participants) {
            if (peerId === this.context.localNodeId)
                continue;
            try {
                await dis.messagingService.sendMessage(peerId, 'swarm_leader_announcement', {
                    roundId: round.roundId,
                    leaderId: this.electedLeaderId
                });
            }
            catch {
                // Best-effort
            }
        }
    }
    async _awaitPeerGradients(expected, deadline) {
        const timeoutMs = Math.max(0, deadline - Date.now());
        const pollMs = 100;
        let elapsed = 0;
        while (this.peerWeights.size < expected && elapsed < timeoutMs) {
            await new Promise(r => setTimeout(r, pollMs));
            elapsed += pollMs;
        }
        console.log(`[SwarmStrategy] Collected ${this.peerWeights.size}/${expected} gradient sets.`);
    }
}
//# sourceMappingURL=SwarmLearningStrategy.js.map