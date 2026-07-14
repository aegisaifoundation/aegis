import { MockNode } from './MockNode.js';
import type { AggregationResult, LearningRound } from '../types/index.js';
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
  private nodes: MockNode[] = [];
  private roundNumber = 0;
  private completedRounds: AggregationResult[] = [];
  /** Artificial delay between node operations (ms) for realism */
  private delayMs: number;

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
  async runFederatedSimulation(coordinatorIndex = 0): Promise<AggregationResult> {
    this.roundNumber++;
    const roundId = `sim-fed-${randomUUID()}`;
    const coordinator = this.nodes[coordinatorIndex] ?? this.nodes[0]!;
    console.log(`\n[SimulationMode] ── Federated Round ${this.roundNumber} ──`);
    console.log(`[SimulationMode] Coordinator: ${coordinator.displayName} (${coordinator.nodeId})`);

    // Step 1: All nodes train locally
    const localWeightSets: Record<string, number[]>[] = [];
    const contributors: string[] = [];

    for (const node of this.nodes) {
      if (this.delayMs > 0) await this._delay(this.delayMs);
      const weights = node.trainLocally(2);
      localWeightSets.push(weights);
      contributors.push(node.nodeId);
    }

    // Step 2: FedAvg aggregation at coordinator
    const globalWeights = this._fedAvg(localWeightSets);
    const resultHash = this._hashWeights(globalWeights);

    // Step 3: Broadcast global model to all nodes
    for (const node of this.nodes) {
      if (this.delayMs > 0) await this._delay(this.delayMs);
      node.applyGlobalWeights(globalWeights);
    }

    const result: AggregationResult = {
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
  async runSwarmSimulation(): Promise<AggregationResult> {
    this.roundNumber++;
    const roundId = `sim-swarm-${randomUUID()}`;
    console.log(`\n[SimulationMode] ── Swarm Round ${this.roundNumber} ──`);

    // Step 1: Leader election — lowest node ID wins
    const sortedNodes = [...this.nodes].sort((a, b) => a.nodeId.localeCompare(b.nodeId));
    const leader = sortedNodes[0]!;
    console.log(`[SimulationMode] Elected swarm leader: ${leader.displayName} (${leader.nodeId})`);

    // Step 2: Each node trains and shares with its peers (P2P gradient exchange)
    const allWeights: Record<string, number[]>[] = [];
    const contributors: string[] = [];

    for (const node of this.nodes) {
      if (this.delayMs > 0) await this._delay(this.delayMs);
      allWeights.push(node.trainLocally(1));
      contributors.push(node.nodeId);
    }

    // Step 3: Distributed aggregation (each node averages all received gradients)
    const globalWeights = this._fedAvg(allWeights);
    const resultHash = this._hashWeights(globalWeights);

    // Step 4: Knowledge propagation — all nodes apply aggregated model
    for (const node of this.nodes) {
      if (this.delayMs > 0) await this._delay(this.delayMs);
      node.applyGlobalWeights(globalWeights);
    }

    const result: AggregationResult = {
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
  async runMultiRound(
    rounds: number,
    strategy: 'federated' | 'swarm' = 'federated'
  ): Promise<AggregationResult[]> {
    const results: AggregationResult[] = [];
    for (let i = 0; i < rounds; i++) {
      const result = strategy === 'swarm'
        ? await this.runSwarmSimulation()
        : await this.runFederatedSimulation();
      results.push(result);
    }
    return results;
  }

  getNodes(): MockNode[] {
    return [...this.nodes];
  }

  getCompletedRounds(): AggregationResult[] {
    return [...this.completedRounds];
  }

  getRoundCount(): number {
    return this.roundNumber;
  }

  getNodeCount(): number {
    return this.nodes.length;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _fedAvg(sets: Record<string, number[]>[]): Record<string, number[]> {
    if (sets.length === 0) return {};
    const result: Record<string, number[]> = {};
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

  private _hashWeights(weights: Record<string, number[]>): string {
    return createHash('sha256')
      .update(JSON.stringify(weights, Object.keys(weights).sort()))
      .digest('hex');
  }

  private _delay(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }
}
