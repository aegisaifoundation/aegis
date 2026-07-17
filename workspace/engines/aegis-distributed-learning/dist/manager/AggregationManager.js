import { createHash, randomUUID } from 'crypto';
/**
 * AggregationManager
 *
 * Responsible for securely combining updates from multiple participants.
 * Supports FedAvg (default) and is structured to accommodate FedProx
 * and future algorithms as plug-in strategies.
 *
 * Enforces contribution validity — rejected contributors are logged in the
 * immutable audit trail. Never exposes raw contributor data externally.
 */
export class AggregationManager {
    rejectedUpdates = new Map();
    auditLog = [];
    /**
     * Aggregate a set of weight maps using Federated Averaging (FedAvg).
     * All weight sets are assumed to be equal-importance (uniform weighting).
     *
     * @param roundId    Active round ID
     * @param roundNumber Round sequence number
     * @param weightSets Array of weight maps, one per contributor
     * @param contributors Ordered list of node IDs matching weightSets
     * @param algorithm  Aggregation algorithm (default: 'fedavg')
     */
    async aggregateWeights(roundId, roundNumber, weightSets, contributors, algorithm = 'fedavg', options) {
        const validSets = weightSets.filter((_, i) => !this.rejectedUpdates.has(contributors[i]));
        const validContributors = contributors.filter(id => !this.rejectedUpdates.has(id));
        if (validSets.length === 0) {
            throw new Error('[AggregationManager] No valid weight sets to aggregate.');
        }
        let aggregated;
        const algLower = algorithm.toLowerCase();
        if (algLower === 'fedprox') {
            aggregated = this._fedProx(validSets);
        }
        else if (algLower === 'weighted_average' || algLower === 'weighted') {
            const weights = options?.sampleCounts ?? validContributors.map(() => 1);
            aggregated = this._weightedAvg(validSets, weights);
        }
        else if (algLower === 'trust_weighted' || algLower === 'trust') {
            const weights = options?.trustScores ?? validContributors.map(() => 1);
            aggregated = this._weightedAvg(validSets, weights);
        }
        else if (algLower === 'performance_weighted' || algLower === 'performance') {
            const weights = options?.performanceScores ?? validContributors.map(() => 1);
            aggregated = this._weightedAvg(validSets, weights);
        }
        else if (algLower === 'adaptive') {
            // Adaptive combines trust, performance, and sample size dynamically
            const trusts = options?.trustScores ?? validContributors.map(() => 1);
            const perfs = options?.performanceScores ?? validContributors.map(() => 1);
            const combinedWeights = validContributors.map((_, i) => (trusts[i] ?? 1) * (perfs[i] ?? 1));
            aggregated = this._weightedAvg(validSets, combinedWeights);
        }
        else {
            aggregated = this._fedAvg(validSets);
        }
        const resultHash = this._hashWeights(aggregated);
        const auditTrail = validContributors.map((nodeId, i) => this._auditRecord('weight_contributed', roundId, nodeId, { index: i }));
        auditTrail.push(this._auditRecord('aggregation_complete', roundId, 'system', {
            algorithm,
            contributorCount: validContributors.length,
            resultHash
        }));
        this.auditLog.push(...auditTrail);
        return {
            roundId,
            roundNumber,
            algorithm,
            contributors: validContributors,
            resultHash,
            auditTrail,
            completedAt: new Date()
        };
    }
    /**
     * Aggregate a set of LoRA delta tensor sets (same mechanism as weight aggregation
     * but semantically specific to LoRA adapters).
     */
    async aggregateLoRA(roundId, roundNumber, loraDeltas, contributors, algorithm = 'fedavg', options) {
        return this.aggregateWeights(roundId, roundNumber, loraDeltas, contributors, algorithm, options);
    }
    /**
     * Mark a contributor's update as invalid — it will be excluded from aggregation.
     * The rejection is logged immutably.
     */
    rejectInvalidUpdate(nodeId, reason) {
        this.rejectedUpdates.set(nodeId, { reason, timestamp: new Date() });
        const record = this._auditRecord('update_rejected', 'system', nodeId, { reason });
        this.auditLog.push(record);
        console.warn(`[AggregationManager] Rejected update from ${nodeId}: ${reason}`);
    }
    /**
     * Validate whether a node ID is a trusted contributor.
     * Delegates trust verification to the DI TrustService when provided.
     */
    async validateContributor(nodeId, diTrustService) {
        if (this.rejectedUpdates.has(nodeId))
            return false;
        if (diTrustService) {
            return diTrustService.verifyPeerTrust(nodeId);
        }
        return true;
    }
    /**
     * Stamp an aggregation result with a deterministic version hash.
     */
    versionResult(result) {
        const data = `${result.roundId}:${result.resultHash}:${result.completedAt.toISOString()}`;
        return createHash('sha256').update(data).digest('hex').slice(0, 16);
    }
    getAuditLog() {
        return [...this.auditLog];
    }
    getRejectedUpdates() {
        return new Map(this.rejectedUpdates);
    }
    clearRoundState() {
        this.rejectedUpdates.clear();
    }
    // ── Algorithms ────────────────────────────────────────────────────────────
    /** Federated Averaging: simple uniform mean across all weight sets */
    _fedAvg(sets) {
        const result = {};
        const keys = Object.keys(sets[0] ?? {});
        for (const key of keys) {
            const allVectors = sets.map(s => s[key] ?? []);
            const len = Math.max(...allVectors.map(v => v.length));
            result[key] = Array.from({ length: len }, (_, i) => {
                const sum = allVectors.reduce((acc, v) => acc + (v[i] ?? 0), 0);
                return sum / sets.length;
            });
        }
        return result;
    }
    /**
     * FedProx: Proximal term regularisation (μ = 0.01 default).
     * Pulls each update closer to the global before averaging,
     * improving convergence in heterogeneous data environments.
     */
    _fedProx(sets, mu = 0.01) {
        const global = this._fedAvg(sets);
        const proxed = sets.map(s => {
            const result = {};
            for (const key of Object.keys(s)) {
                const g = global[key] ?? [];
                result[key] = (s[key] ?? []).map((w, i) => w - mu * (w - (g[i] ?? 0)));
            }
            return result;
        });
        return this._fedAvg(proxed);
    }
    /** Weighted Averaging based on variable node weighting (e.g. sample size, trust, performance) */
    _weightedAvg(sets, weights) {
        const result = {};
        const keys = Object.keys(sets[0] ?? {});
        const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;
        for (const key of keys) {
            const allVectors = sets.map(s => s[key] ?? []);
            const len = Math.max(...allVectors.map(v => v.length));
            result[key] = Array.from({ length: len }, (_, i) => {
                const sum = allVectors.reduce((acc, v, j) => acc + (v[i] ?? 0) * (weights[j] ?? 1), 0);
                return sum / totalWeight;
            });
        }
        return result;
    }
    _hashWeights(weights) {
        const serialised = JSON.stringify(weights, Object.keys(weights).sort());
        return createHash('sha256').update(serialised).digest('hex');
    }
    _auditRecord(eventType, roundId, nodeId, detail) {
        return {
            eventId: randomUUID(),
            eventType,
            roundId,
            nodeId,
            timestamp: new Date(),
            detail
        };
    }
}
//# sourceMappingURL=AggregationManager.js.map