import type { TrainingMetrics, LoRAAdapter } from '../types/index.js';
/**
 * MockNode
 *
 * Represents a single simulated AEGIS node in development/simulation mode.
 * Each MockNode has independent model weights, LoRA adapters, memory,
 * and metrics — faithfully simulating a real distributed node.
 *
 * Used by SimulationMode to test full learning rounds on a single machine.
 */
export declare class MockNode {
    readonly nodeId: string;
    readonly displayName: string;
    private localWeights;
    private loraAdapter;
    private localMemory;
    private metrics;
    private roundsParticipated;
    constructor(displayName: string);
    /**
     * Simulate one local training epoch.
     * Returns the updated LoRA delta weights.
     */
    trainLocally(epochs?: number): Record<string, number[]>;
    /**
     * Apply an aggregated global model to this node.
     * Simulates the node receiving and internalising global weights.
     */
    applyGlobalWeights(globalWeights: Record<string, number[]>): void;
    getLocalWeights(): Record<string, number[]>;
    getLoRAAdapter(): LoRAAdapter;
    getMetrics(): TrainingMetrics;
    getRoundsParticipated(): number;
}
//# sourceMappingURL=MockNode.d.ts.map