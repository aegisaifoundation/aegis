import { MockNode } from './MockNode.js';
import { randomUUID } from 'crypto';
import { createHash } from 'crypto';
/**
 * SimulationMode
 *
 * Orchestrates up to N MockNode instances on a single machine.
 * Provides complete learning round simulation without requiring
 * real network connections or the Distributed Intelligence Engine.
 *
 * Used for:
 *   - Development and testing on a single computer
 *   - CI/CD validation of learning algorithms
 *   - Demonstration of multi-node federated/swarm learning
 *
 * Each simulation run is self-contained with an in-memory event bus.
 */
export class SimulationMode {
    nodes = [];
    roundNumber = 0;
    completedRounds = [];
    /** Artificial delay between node operations (ms) for realism */
    delayMs;
    constructor(nodeCount = 4, delayMs = 0) {
        this.delayMs = delayMs;
        const names = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'];
        for (let i = 0; i < nodeCount; i++) {
            this.nodes.push(new MockNode(names[i] ?? `Node-${i}`));
        }
        console.log(`[SimulationMode] Initialised with ${nodeCount} mock nodes.`);
    }
    /**
     * Run a full federated learning simulation round.
     *
     * Each node trains locally → coordinator collects weights →
     * FedAvg aggregation → all nodes receive global model.
     *
     * @param coordinatorIndex  Index of the coordinating node (0 by default)
     */
    async runFederatedSimulation(coordinatorIndex = 0) {
        this.roundNumber++;
        const roundId = `sim-fed-${randomUUID()}`;
        const coordinator = this.nodes[coordinatorIndex] ?? this.nodes[0];
        console.log(`\n[SimulationMode] ── Federated Round ${this.roundNumber} ──`);
        console.log(`[SimulationMode] Coordinator: ${coordinator.displayName} (${coordinator.nodeId})`);
        // Step 1: All nodes train locally
        const localWeightSets = [];
        const contributors = [];
        for (const node of this.nodes) {
            if (this.delayMs > 0)
                await this._delay(this.delayMs);
            const weights = node.trainLocally(2);
            localWeightSets.push(weights);
            contributors.push(node.nodeId);
        }
        // Step 2: FedAvg aggregation at coordinator
        const globalWeights = this._fedAvg(localWeightSets);
        const resultHash = this._hashWeights(globalWeights);
        // Step 3: Broadcast global model to all nodes
        for (const node of this.nodes) {
            if (this.delayMs > 0)
                await this._delay(this.delayMs);
            node.applyGlobalWeights(globalWeights);
        }
        const result = {
            roundId,
            roundNumber: this.roundNumber,
            algorithm: 'fedavg',
            contributors,
            resultHash,
            auditTrail: [],
            completedAt: new Date()
        };
        this.completedRounds.push(result);
        console.log(`[SimulationMode] Federated round ${this.roundNumber} complete. Hash: ${resultHash.slice(0, 16)}...`);
        return result;
    }
    /**
     * Run a full swarm learning simulation round.
     *
     * Nodes elect a leader (lowest ID) → share gradients P2P →
     * distributed aggregation → all nodes converge.
     */
    async runSwarmSimulation() {
        this.roundNumber++;
        const roundId = `sim-swarm-${randomUUID()}`;
        console.log(`\n[SimulationMode] ── Swarm Round ${this.roundNumber} ──`);
        // Step 1: Leader election — lowest node ID wins
        const sortedNodes = [...this.nodes].sort((a, b) => a.nodeId.localeCompare(b.nodeId));
        const leader = sortedNodes[0];
        console.log(`[SimulationMode] Elected swarm leader: ${leader.displayName} (${leader.nodeId})`);
        // Step 2: Each node trains and shares with its peers (P2P gradient exchange)
        const allWeights = [];
        const contributors = [];
        for (const node of this.nodes) {
            if (this.delayMs > 0)
                await this._delay(this.delayMs);
            allWeights.push(node.trainLocally(1));
            contributors.push(node.nodeId);
        }
        // Step 3: Distributed aggregation (each node averages all received gradients)
        const globalWeights = this._fedAvg(allWeights);
        const resultHash = this._hashWeights(globalWeights);
        // Step 4: Knowledge propagation — all nodes apply aggregated model
        for (const node of this.nodes) {
            if (this.delayMs > 0)
                await this._delay(this.delayMs);
            node.applyGlobalWeights(globalWeights);
        }
        const result = {
            roundId,
            roundNumber: this.roundNumber,
            algorithm: 'swarm-fedavg',
            contributors,
            resultHash,
            auditTrail: [],
            completedAt: new Date()
        };
        this.completedRounds.push(result);
        console.log(`[SimulationMode] Swarm round ${this.roundNumber} complete. Leader: ${leader.displayName}`);
        return result;
    }
    /**
     * Run multiple rounds and return all results.
     * @param rounds    Number of rounds to simulate
     * @param strategy  'federated' | 'swarm'
     */
    async runMultiRound(rounds, strategy = 'federated') {
        const results = [];
        for (let i = 0; i < rounds; i++) {
            const result = strategy === 'swarm'
                ? await this.runSwarmSimulation()
                : await this.runFederatedSimulation();
            results.push(result);
        }
        return results;
    }
    getNodes() {
        return [...this.nodes];
    }
    getCompletedRounds() {
        return [...this.completedRounds];
    }
    getRoundCount() {
        return this.roundNumber;
    }
    getNodeCount() {
        return this.nodes.length;
    }
    // ── Private ───────────────────────────────────────────────────────────────
    _fedAvg(sets) {
        if (sets.length === 0)
            return {};
        const result = {};
        const keys = Object.keys(sets[0] ?? {});
        for (const key of keys) {
            const vecs = sets.map(s => s[key] ?? []);
            const len = Math.max(...vecs.map(v => v.length));
            result[key] = Array.from({ length: len }, (_, i) => {
                const sum = vecs.reduce((acc, v) => acc + (v[i] ?? 0), 0);
                return sum / sets.length;
            });
        }
        return result;
    }
    _hashWeights(weights) {
        return createHash('sha256')
            .update(JSON.stringify(weights, Object.keys(weights).sort()))
            .digest('hex');
    }
    _delay(ms) {
        return new Promise(r => setTimeout(r, ms));
    }
}
//# sourceMappingURL=SimulationMode.js.map