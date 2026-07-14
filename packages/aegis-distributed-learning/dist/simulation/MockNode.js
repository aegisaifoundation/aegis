import { randomUUID } from 'crypto';
/**
 * MockNode
 *
 * Represents a single simulated AEGIS node in development/simulation mode.
 * Each MockNode has independent model weights, LoRA adapters, memory,
 * and metrics — faithfully simulating a real distributed node.
 *
 * Used by SimulationMode to test full learning rounds on a single machine.
 */
export class MockNode {
    nodeId;
    displayName;
    localWeights;
    loraAdapter;
    localMemory;
    metrics;
    roundsParticipated = 0;
    constructor(displayName) {
        this.nodeId = `mock-node-${randomUUID().slice(0, 8)}`;
        this.displayName = displayName;
        // Each node starts with independent random weights
        this.localWeights = {
            layer1: Array.from({ length: 8 }, () => (Math.random() - 0.5) * 0.1),
            layer2: Array.from({ length: 8 }, () => (Math.random() - 0.5) * 0.1),
            output: Array.from({ length: 4 }, () => (Math.random() - 0.5) * 0.1)
        };
        // Unique local LoRA adapter
        this.loraAdapter = {
            id: `lora-${this.nodeId}`,
            modelId: 'base-model-v1',
            version: 'v1.0.0',
            rank: 4,
            alpha: 16,
            path: `/mock/${this.nodeId}/lora.json`,
            hash: 'mock-hash-' + this.nodeId,
            signature: 'mock-sig-' + this.nodeId,
            sizeBytes: 1024,
            createdAt: new Date(),
            metadata: { node: displayName }
        };
        this.localMemory = { nodeId: this.nodeId, session: randomUUID() };
        this.metrics = {
            accuracy: 0.5 + Math.random() * 0.2,
            loss: 0.8 - Math.random() * 0.2,
            rounds: 0,
            participantCount: 1,
            epochsCompleted: 0,
            timestamp: new Date()
        };
    }
    /**
     * Simulate one local training epoch.
     * Returns the updated LoRA delta weights.
     */
    trainLocally(epochs = 2) {
        const lr = 0.01;
        for (let e = 0; e < epochs; e++) {
            for (const key of Object.keys(this.localWeights)) {
                this.localWeights[key] = this.localWeights[key].map(w => w - lr * (Math.random() - 0.5) * 0.05);
            }
            this.metrics.loss = Math.max(0.01, this.metrics.loss - 0.05 + Math.random() * 0.01);
            this.metrics.accuracy = Math.min(0.99, this.metrics.accuracy + 0.04 + Math.random() * 0.01);
        }
        this.metrics.epochsCompleted += epochs;
        console.log(`[MockNode:${this.displayName}] Trained ${epochs} epochs — loss=${this.metrics.loss.toFixed(4)}, acc=${this.metrics.accuracy.toFixed(4)}`);
        return { ...this.localWeights };
    }
    /**
     * Apply an aggregated global model to this node.
     * Simulates the node receiving and internalising global weights.
     */
    applyGlobalWeights(globalWeights) {
        // Weighted blend: 70% global, 30% local (simulates personalisation)
        for (const key of Object.keys(globalWeights)) {
            const g = globalWeights[key] ?? [];
            const l = this.localWeights[key] ?? [];
            this.localWeights[key] = g.map((gw, i) => 0.7 * gw + 0.3 * (l[i] ?? 0));
        }
        this.roundsParticipated++;
        this.metrics.rounds++;
        console.log(`[MockNode:${this.displayName}] Applied global weights. Total rounds: ${this.roundsParticipated}`);
    }
    getLocalWeights() {
        return { ...this.localWeights };
    }
    getLoRAAdapter() {
        return this.loraAdapter;
    }
    getMetrics() {
        return { ...this.metrics };
    }
    getRoundsParticipated() {
        return this.roundsParticipated;
    }
}
//# sourceMappingURL=MockNode.js.map