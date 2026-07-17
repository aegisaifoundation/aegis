export class ReputationManager {
    reputationStore = new Map();
    constructor(localNodeId) {
        this.reputationStore.set(localNodeId, this._defaultMetrics(localNodeId));
    }
    getReputation(nodeId) {
        let metrics = this.reputationStore.get(nodeId);
        if (!metrics) {
            metrics = this._defaultMetrics(nodeId);
            this.reputationStore.set(nodeId, metrics);
        }
        return metrics;
    }
    recordContribution(nodeId, success) {
        const metrics = this.getReputation(nodeId);
        metrics.contributionCount += 1;
        if (success) {
            metrics.trustScore = Math.min(1.0, metrics.trustScore + 0.01);
            metrics.packageQuality = Math.min(1.0, metrics.packageQuality + 0.02);
        }
        else {
            metrics.trustScore = Math.max(0.0, metrics.trustScore - 0.05);
            metrics.packageQuality = Math.max(0.0, metrics.packageQuality - 0.05);
        }
        console.log(`[ReputationManager] Contribution recorded for ${nodeId}. New trust score: ${metrics.trustScore.toFixed(4)}`);
    }
    recordReasoningOutcome(nodeId, accuracy) {
        const metrics = this.getReputation(nodeId);
        metrics.reasoningAccuracy = (metrics.reasoningAccuracy * 4 + accuracy) / 5;
        metrics.trustScore = Math.min(1.0, metrics.trustScore + (accuracy - 0.5) * 0.02);
        console.log(`[ReputationManager] Reasoning evaluated for ${nodeId}. New reasoning accuracy: ${metrics.reasoningAccuracy.toFixed(4)}`);
    }
    recordAvailability(nodeId, available) {
        const metrics = this.getReputation(nodeId);
        metrics.participationRate += 1;
        const currentRate = metrics.availabilityRate;
        metrics.availabilityRate = available
            ? Math.min(1.0, currentRate * 0.95 + 0.05)
            : Math.max(0.0, currentRate * 0.95);
    }
    _defaultMetrics(nodeId) {
        return {
            nodeId,
            trustScore: 0.8,
            contributionCount: 5,
            learningCount: 2,
            availabilityRate: 0.9,
            validationAccuracy: 0.85,
            knowledgeQuality: 0.8,
            reasoningAccuracy: 0.85,
            packageQuality: 0.8,
            participationRate: 0.85
        };
    }
}
