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
export class LocalTrainer {
  private isRunning = false;
  private isCancelled = false;
  private progress: TrainingProgress = {
    epoch: 0,
    totalEpochs: 0,
    loss: 1.0,
    accuracy: 0.0,
    elapsedMs: 0,
    cancelled: false
  };

  constructor(
    private readonly loraManager: LoRAManager,
    private readonly checkpointManager: LearningCheckpointManager
  ) {}

  /**
   * Train a base model using the specified configuration.
   * Runs epoch × batch simulation, checkpointing every N epochs.
   *
   * @param config  Training configuration (epochs, batchSize, learningRate, etc.)
   * @returns Final training metrics
   */
  async train(config: {
    modelId: string;
    epochs: number;
    batchSize?: number;
    learningRate?: number;
    checkpointFrequency?: number;
    resumeCheckpointId?: string;
  }): Promise<TrainingMetrics> {
    this.isRunning = true;
    this.isCancelled = false;
    const start = Date.now();
    const lr = config.learningRate ?? 1e-4;
    const freq = config.checkpointFrequency ?? 5;

    let loss = 1.0;
    let accuracy = 0.0;
    let startEpoch = 0;

    // Resume from checkpoint if specified
    if (config.resumeCheckpointId) {
      const checkpoint = this.checkpointManager.restoreTrainingCheckpoint(config.resumeCheckpointId);
      if (checkpoint) {
        startEpoch = checkpoint.epoch;
        const weights = checkpoint.weights;
        loss = weights['loss']?.[0] ?? 1.0;
        accuracy = weights['accuracy']?.[0] ?? 0.0;
        console.log(`[LocalTrainer] Resumed from epoch ${startEpoch}, loss=${loss.toFixed(4)}`);
      }
    }

    this.progress = { epoch: startEpoch, totalEpochs: config.epochs, loss, accuracy, elapsedMs: 0, cancelled: false };

    for (let epoch = startEpoch; epoch < config.epochs; epoch++) {
      if (this.isCancelled) break;

      // Simulate one epoch of SGD convergence
      loss = Math.max(0.01, loss - lr * 10 * (1 - loss / 1.5) + (Math.random() - 0.5) * 0.005);
      accuracy = Math.min(0.999, 1.0 - loss * 0.8 + (Math.random() - 0.5) * 0.002);

      this.progress = {
        epoch: epoch + 1,
        totalEpochs: config.epochs,
        loss,
        accuracy,
        elapsedMs: Date.now() - start,
        cancelled: false
      };

      // Checkpoint at frequency
      if ((epoch + 1) % freq === 0) {
        await this.checkpointManager.saveTrainingCheckpoint(epoch + 1, {
          loss: [loss],
          accuracy: [accuracy]
        });
      }

      // Brief yield to avoid blocking event loop
      await new Promise(r => setImmediate(r));
    }

    this.isRunning = false;

    return {
      accuracy,
      loss,
      rounds: 1,
      participantCount: 1,
      epochsCompleted: this.progress.epoch,
      timestamp: new Date()
    };
  }

  /**
   * Fine-tune a LoRA adapter for the specified model.
   * Creates a new adapter (or updates an existing one) with improved weights.
   *
   * @param modelId   Base model to fine-tune against
   * @param loraConfig LoRA configuration (rank, alpha, target modules)
   * @param epochs    Number of fine-tuning epochs
   */
  async trainLoRA(
    modelId: string,
    loraConfig: LoRAConfig,
    epochs = 3
  ): Promise<{ adapterId: string; metrics: TrainingMetrics }> {
    console.log(`[LocalTrainer] Starting LoRA fine-tuning for ${modelId} (rank=${loraConfig.rank}, epochs=${epochs})...`);

    const adapter = this.loraManager.createAdapter(modelId, loraConfig);
    const start = Date.now();

    let loss = 0.8;
    let accuracy = 0.2;

    for (let epoch = 0; epoch < epochs; epoch++) {
      if (this.isCancelled) break;

      // Simulate LoRA gradient updates (low-rank projection improvement)
      loss = Math.max(0.02, loss - 0.15 + (Math.random() - 0.5) * 0.02);
      accuracy = Math.min(0.97, accuracy + 0.22 + (Math.random() - 0.5) * 0.02);

      // Update adapter weights after each epoch
      const updatedWeights: Record<string, number[]> = {};
      for (const module of loraConfig.targetModules) {
        updatedWeights[module] = Array.from({ length: loraConfig.rank }, () =>
          (Math.random() - 0.5) * 0.01 * (1 - epoch / epochs) * (loraConfig.alpha / loraConfig.rank)
        );
      }
      this.loraManager.updateAdapterWeights(adapter.id, updatedWeights);

      await new Promise(r => setImmediate(r));
    }

    const metrics: TrainingMetrics = {
      accuracy,
      loss,
      rounds: 1,
      participantCount: 1,
      epochsCompleted: epochs,
      timestamp: new Date()
    };

    console.log(`[LocalTrainer] LoRA training complete. Adapter: ${adapter.id}, accuracy=${accuracy.toFixed(4)}, loss=${loss.toFixed(4)}, elapsed=${Date.now() - start}ms`);
    return { adapterId: adapter.id, metrics };
  }

  /**
   * Evaluate a model against a simulated dataset.
   * Returns accuracy and loss metrics without modifying model state.
   */
  async evaluate(modelId: string, _datasetSize = 1000): Promise<TrainingMetrics> {
    // Simulate evaluation with mild random variance
    return {
      accuracy: 0.87 + (Math.random() - 0.5) * 0.04,
      loss: 0.31 + (Math.random() - 0.5) * 0.03,
      rounds: 0,
      participantCount: 1,
      epochsCompleted: 0,
      timestamp: new Date()
    };
  }

  /** Cancel the currently running training job */
  cancel(reason = 'user_requested'): void {
    if (!this.isRunning) return;
    this.isCancelled = true;
    this.progress.cancelled = true;
    console.log(`[LocalTrainer] Training cancelled: ${reason}`);
  }

  /** Get current training progress */
  getProgress(): TrainingProgress {
    return { ...this.progress };
  }

  isTraining(): boolean {
    return this.isRunning;
  }
}
