import type { TrainingProgress, TrainingMetrics, LoRAConfig } from '../types/index.js';
import type { LoRAManager } from './LoRAManager.js';
import type { LearningCheckpointManager } from '../manager/LearningCheckpointManager.js';
/**
 * LocalTrainer
 *
 * Simulates local model training on this node.
 * Responsible for epoch cycles, LoRA fine-tuning, evaluation,
 * checkpointing, resumption, and cancellation.
 *
 * In production, this layer would integrate with an ML framework
 * (e.g., llama.cpp, PyTorch bindings, ONNX Runtime).
 * Currently simulates training with deterministic metric evolution.
 */
export declare class LocalTrainer {
    private readonly loraManager;
    private readonly checkpointManager;
    private isRunning;
    private isCancelled;
    private progress;
    constructor(loraManager: LoRAManager, checkpointManager: LearningCheckpointManager);
    /**
     * Train a base model using the specified configuration.
     * Runs epoch × batch simulation, checkpointing every N epochs.
     *
     * @param config  Training configuration (epochs, batchSize, learningRate, etc.)
     * @returns Final training metrics
     */
    train(config: {
        modelId: string;
        epochs: number;
        batchSize?: number;
        learningRate?: number;
        checkpointFrequency?: number;
        resumeCheckpointId?: string;
    }): Promise<TrainingMetrics>;
    /**
     * Fine-tune a LoRA adapter for the specified model.
     * Creates a new adapter (or updates an existing one) with improved weights.
     *
     * @param modelId   Base model to fine-tune against
     * @param loraConfig LoRA configuration (rank, alpha, target modules)
     * @param epochs    Number of fine-tuning epochs
     */
    trainLoRA(modelId: string, loraConfig: LoRAConfig, epochs?: number): Promise<{
        adapterId: string;
        metrics: TrainingMetrics;
    }>;
    /**
     * Evaluate a model against a simulated dataset.
     * Returns accuracy and loss metrics without modifying model state.
     */
    evaluate(modelId: string, _datasetSize?: number): Promise<TrainingMetrics>;
    /** Cancel the currently running training job */
    cancel(reason?: string): void;
    /** Get current training progress */
    getProgress(): TrainingProgress;
    isTraining(): boolean;
}
//# sourceMappingURL=LocalTrainer.d.ts.map