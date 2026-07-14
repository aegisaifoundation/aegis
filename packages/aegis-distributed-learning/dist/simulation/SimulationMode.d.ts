import { MockNode } from './MockNode.js';
import type { AggregationResult } from '../types/index.js';
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
export declare class SimulationMode {
    private nodes;
    private roundNumber;
    private completedRounds;
    /** Artificial delay between node operations (ms) for realism */
    private delayMs;
    constructor(nodeCount?: number, delayMs?: number);
    /**
     * Run a full federated learning simulation round.
     *
     * Each node trains locally → coordinator collects weights →
     * FedAvg aggregation → all nodes receive global model.
     *
     * @param coordinatorIndex  Index of the coordinating node (0 by default)
     */
    runFederatedSimulation(coordinatorIndex?: number): Promise<AggregationResult>;
    /**
     * Run a full swarm learning simulation round.
     *
     * Nodes elect a leader (lowest ID) → share gradients P2P →
     * distributed aggregation → all nodes converge.
     */
    runSwarmSimulation(): Promise<AggregationResult>;
    /**
     * Run multiple rounds and return all results.
     * @param rounds    Number of rounds to simulate
     * @param strategy  'federated' | 'swarm'
     */
    runMultiRound(rounds: number, strategy?: 'federated' | 'swarm'): Promise<AggregationResult[]>;
    getNodes(): MockNode[];
    getCompletedRounds(): AggregationResult[];
    getRoundCount(): number;
    getNodeCount(): number;
    private _fedAvg;
    private _hashWeights;
    private _delay;
}
//# sourceMappingURL=SimulationMode.d.ts.map