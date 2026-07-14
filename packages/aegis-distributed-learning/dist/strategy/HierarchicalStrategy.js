/**
 * HierarchicalStrategy — Architecture Placeholder
 *
 * Future: Organises nodes into a tree of aggregation clusters.
 * Leaf nodes train locally → cluster coordinators aggregate locally
 * → a global root coordinator performs final global aggregation.
 *
 * Use cases: Cross-silo federated learning, hospital networks,
 * enterprise federated AI, large-scale edge deployments.
 *
 * Implementation deferred to a future phase.
 * API surface is fixed by ILearningStrategy and will not change.
 */
export class HierarchicalStrategy {
    name = 'hierarchical';
    async initialize(_context) {
        console.warn('[HierarchicalStrategy] Architecture placeholder. Not yet implemented.');
    }
    async prepareRound(_round) {
        throw new Error('[HierarchicalStrategy] Not yet implemented.');
    }
    async selectParticipants(_candidates) {
        throw new Error('[HierarchicalStrategy] Not yet implemented.');
    }
    async exchangeUpdates(_round) {
        throw new Error('[HierarchicalStrategy] Not yet implemented.');
    }
    async aggregate(_round) {
        throw new Error('[HierarchicalStrategy] Not yet implemented.');
    }
    async validate(_result) {
        throw new Error('[HierarchicalStrategy] Not yet implemented.');
    }
    async publishModel(_result) {
        throw new Error('[HierarchicalStrategy] Not yet implemented.');
    }
    async finishRound(_round) {
        throw new Error('[HierarchicalStrategy] Not yet implemented.');
    }
    async shutdown() { }
}
//# sourceMappingURL=HierarchicalStrategy.js.map