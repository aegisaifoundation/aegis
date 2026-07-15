import { ITrainingBackend } from '../ITrainingBackend.js';
import { TrainingMetrics, TrainingProgress } from '../../types/index.js';

export class FutureBackend implements ITrainingBackend {
  readonly id = 'future';

  async train(
    modelId: string,
    dataset: any,
    config: {
      epochs: number;
      learningRate?: number;
      batchSize?: number;
      checkpointFrequency?: number;
      onProgress?: (progress: TrainingProgress) => void;
    }
  ): Promise<{ weights: Record<string, number[]>; metrics: TrainingMetrics }> {
    console.log(`[FutureBackend] Preparing custom model training on ${modelId}...`);

    const start = Date.now();
    let loss = 0.85;
    let accuracy = 0.2;
    const lr = config.learningRate ?? 1e-4;

    for (let epoch = 1; epoch <= config.epochs; epoch++) {
      loss = Math.max(0.01, loss - lr * 13 + (Math.random() - 0.5) * 0.009);
      accuracy = Math.min(0.999, accuracy + lr * 11 + (Math.random() - 0.5) * 0.004);

      if (config.onProgress) {
        config.onProgress({
          epoch,
          totalEpochs: config.epochs,
          loss,
          accuracy,
          elapsedMs: Date.now() - start,
          cancelled: false
        });
      }

      await new Promise(r => setImmediate(r));
    }

    const weights: Record<string, number[]> = {
      'q_proj': Array.from({ length: 4 }, () => (Math.random() - 0.5) * 0.012),
      'v_proj': Array.from({ length: 4 }, () => (Math.random() - 0.5) * 0.012)
    };

    const metrics: TrainingMetrics = {
      accuracy,
      loss,
      rounds: 1,
      participantCount: 1,
      epochsCompleted: config.epochs,
      timestamp: new Date()
    };

    return { weights, metrics };
  }
}
