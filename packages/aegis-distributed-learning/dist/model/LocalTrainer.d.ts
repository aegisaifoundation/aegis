import type { TrainingProgress, TrainingMetrics, LoRAConfig } from '../types/index.js';
import type { LoRAManager } from './LoRAManager.js';
import type { LearningCheckpointManager } from '../manager/LearningCheckpointManager.js';
import { ITrainingBackend } from './ITrainingBackend.js';
/**
 * LocalTrainer
 *
 * Coordinates local model training on this node.
 * Routes training tasks to the selected ITrainingBackend simulator,
 * loading datasets solely through the AEGIS Data Engine (ADE).
 */
export declare class LocalTrainer {
    private readonly loraManager;
    private readonly checkpointManager;
    private isRunning;
    private isCancelled;
    private progress;
    private backends;
    private activeBackendId;
    constructor(loraManager: LoRAManager, checkpointManager: LearningCheckpointManager);
    setBackend(backendId: string): void;
    getBackend(): ITrainingBackend;
    /**
     * Query the AEGIS Data Engine (ADE) for a prepared dataset.
     * Enforces that the engine never reads files directly.
     */
    private getPreparedDataset;
    /**
     * Train a base model using the active training backend.
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
     */
    trainLoRA(modelId: string, loraConfig: LoRAConfig, epochs?: number): Promise<{
        adapterId: string;
        metrics: TrainingMetrics;
    }>;
    /** Evaluate a model against a simulated dataset */
    evaluate(modelId: string, _datasetSize?: number): Promise<TrainingMetrics>;
    /** Cancel the currently running training job */
    cancel(reason?: string): void;
    /** Get current training progress */
    getProgress(): TrainingProgress;
    isTraining(): boolean;
}
//# sourceMappingURL=LocalTrainer.d.ts.map