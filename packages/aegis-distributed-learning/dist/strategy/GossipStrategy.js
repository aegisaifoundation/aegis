/**
 * GossipStrategy — Architecture Placeholder
 *
 * Future: Nodes propagate model updates peer-to-peer via epidemic gossip.
 * No coordinator required. Updates spread exponentially across the network
 * until convergence. Extremely resilient to node failures.
 *
 * Use cases: IoT learning, edge AI with unreliable connectivity,
 * fully decentralised deployments with no stable infrastructure.
 *
 * Implementation deferred to a future phase.
 * API surface is fixed by ILearningStrategy and will not change.
 */
export class GossipStrategy {
    name = 'gossip';
    async initialize(_context) {
        console.warn('[GossipStrategy] Architecture placeholder. Not yet implemented.');
    }
    async prepareRound(_round) {
        throw new Error('[GossipStrategy] Not yet implemented.');
    }
    async selectParticipants(_candidates) {
        throw new Error('[GossipStrategy] Not yet implemented.');
    }
    async exchangeUpdates(_round) {
        throw new Error('[GossipStrategy] Not yet implemented.');
    }
    async aggregate(_round) {
        throw new Error('[GossipStrategy] Not yet implemented.');
    }
    async validate(_result) {
        throw new Error('[GossipStrategy] Not yet implemented.');
    }
    async publishModel(_result) {
        throw new Error('[GossipStrategy] Not yet implemented.');
    }
    async finishRound(_round) {
        throw new Error('[GossipStrategy] Not yet implemented.');
    }
    async shutdown() { }
}
//# sourceMappingURL=GossipStrategy.js.map