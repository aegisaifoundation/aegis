import type { TrainingProgress, TrainingMetrics, LoRAConfig } from '../types/index.js';
import type { LoRAManager } from './LoRAManager.js';
import type { LearningCheckpointManager } from '../manager/LearningCheckpointManager.js';
import { serviceRegistry, eventBus } from '@aegis/runtime';
import { ITrainingBackend } from './ITrainingBackend.js';
import { PyTorchBackend } from './backends/PyTorchBackend.js';
import { LlamaCppBackend } from './backends/LlamaCppBackend.js';
import { OllamaBackend } from './backends/OllamaBackend.js';
import { FutureBackend } from './backends/FutureBackend.js';

/**
 * LocalTrainer
 *
 * Coordinates local model training on this node.
 * Routes training tasks to the selected ITrainingBackend simulator,
 * loading datasets solely through the AEGIS Data Engine (ADE).
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

  private backends = new Map<string, ITrainingBackend>();
  private activeBackendId = 'pytorch';

  constructor(
    private readonly loraManager: LoRAManager,
    private readonly checkpointManager: LearningCheckpointManager,
    private readonly workspacePath?: string
  ) {
    this.backends.set('pytorch', new PyTorchBackend(workspacePath));
    this.backends.set('llamacpp', new LlamaCppBackend());
    this.backends.set('ollama', new OllamaBackend());
    this.backends.set('future', new FutureBackend());
  }

  setBackend(backendId: string): void {
    if (!this.backends.has(backendId)) {
      throw new Error(`[LocalTrainer] Unknown training backend: ${backendId}`);
    }
    this.activeBackendId = backendId;
  }

  getBackend(): ITrainingBackend {
    return this.backends.get(this.activeBackendId) || this.backends.get('pytorch')!;
  }

  /**
   * Query the AEGIS Data Engine (ADE) for a prepared dataset.
   * Enforces that the engine never reads files directly.
   */
  private async getPreparedDataset(modelId: string): Promise<any> {
    const dataEngine = serviceRegistry.has('aegis-data')
      ? serviceRegistry.get<any>('aegis-data')
      : null;
    if (!dataEngine) {
      console.warn('[LocalTrainer] Data Engine (ADE) not registered. Defaulting to fallback mock dataset.');
      return { datasetId: 'fallback-mock', samples: 100 };
    }

    try {
      const datasets = await dataEngine.ListDatasets();
      // Match dataset for this modelId if possible, or get latest prepared dataset
      const matched = datasets.find((d: any) => d.status === 'Processed' && d.policies?.allowTraining === true);
      if (matched) {
        const stats = await dataEngine.DatasetStatistics(matched.datasetId);
        return {
          datasetId: matched.datasetId,
          samples: matched.samples,
          language: matched.language,
          statistics: stats
        };
      }
    } catch (err: any) {
      console.warn(`[LocalTrainer] Error fetching prepared dataset: ${err.message}`);
    }

    return { datasetId: 'mock-clinical-001', samples: 200, statistics: { words: 5000 } };
  }

  /**
   * Train a base model using the active training backend.
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

    // Load prepared dataset from Data Engine (no direct file reads)
    const dataset = await this.getPreparedDataset(config.modelId);
    const backend = this.getBackend();

    const start = Date.now();
    let startEpoch = 0;
    let initialWeights: Record<string, number[]> | undefined;

    // Resume from checkpoint if specified
    if (config.resumeCheckpointId) {
      const checkpoint = this.checkpointManager.restoreTrainingCheckpoint(config.resumeCheckpointId);
      if (checkpoint) {
        startEpoch = checkpoint.epoch;
        initialWeights = checkpoint.weights;
        console.log(`[LocalTrainer] Resuming from checkpoint ${config.resumeCheckpointId} at epoch ${startEpoch}`);
      }
    }

    this.progress = {
      epoch: startEpoch,
      totalEpochs: config.epochs,
      loss: 1.0,
      accuracy: 0.1,
      elapsedMs: 0,
      cancelled: false
    };

    const freq = config.checkpointFrequency ?? 5;

    try {
      const trainResult = await backend.train(config.modelId, dataset, {
        epochs: config.epochs - startEpoch,
        learningRate: config.learningRate,
        batchSize: config.batchSize,
        checkpointFrequency: freq,
        onProgress: (progress) => {
          if (this.isCancelled) {
            progress.cancelled = true;
          }
          this.progress = {
            ...progress,
            epoch: startEpoch + progress.epoch
          };
          
          if (this.progress.epoch % freq === 0) {
            this.checkpointManager.saveTrainingCheckpoint(this.progress.epoch, trainResult?.weights || {});
          }
        }
      });

      this.isRunning = false;
      return trainResult.metrics;

    } catch (err: any) {
      this.isRunning = false;
      throw err;
    }
  }

  /**
   * Fine-tune a LoRA adapter for the specified model.
   */
  async trainLoRA(
    modelId: string,
    loraConfig: any,
    epochs = 3
  ): Promise<{ adapterId: string; metrics: TrainingMetrics }> {
    this.isRunning = true;
    this.isCancelled = false;

    const adapter = this.loraManager.createAdapter(modelId, loraConfig);
    const dataset = await this.getPreparedDataset(modelId);
    const backend = this.getBackend();

    try {
      const result = await backend.train(modelId, dataset, {
        epochs,
        learningRate: loraConfig.learningRate,
        batchSize: loraConfig.batchSize,
        rank: loraConfig.rank,
        alpha: loraConfig.alpha,
        validationThreshold: loraConfig.validationThreshold,
        onProgress: (progress) => {
          if (this.isCancelled) {
            progress.cancelled = true;
          }
          this.progress = progress;
          eventBus.emit('training_progress', { modelId, adapterId: adapter.id, ...progress });
        }
      });

      this.loraManager.updateAdapterWeights(adapter.id, result.weights);
      this.isRunning = false;

      console.log(`[LocalTrainer] LoRA training complete. Adapter: ${adapter.id}, accuracy=${result.metrics.accuracy.toFixed(4)}`);
      eventBus.emit('training_completed', { modelId, adapterId: adapter.id, metrics: result.metrics });
      return { adapterId: adapter.id, metrics: result.metrics };
    } catch (err: any) {
      this.isRunning = false;
      eventBus.emit('training_error', { modelId, adapterId: adapter.id, error: err.message });
      throw err;
    }
  }

  /** Evaluate a model against a simulated dataset */
  async evaluate(modelId: string, _datasetSize = 1000): Promise<TrainingMetrics> {
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
