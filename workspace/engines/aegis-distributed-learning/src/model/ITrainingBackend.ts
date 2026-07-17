import { TrainingMetrics, TrainingProgress } from '../types/index.js';

export interface ITrainingBackend {
  readonly id: string;
  train(
    modelId: string,
    dataset: any,
    config: {
      epochs: number;
      learningRate?: number;
      batchSize?: number;
      checkpointFrequency?: number;
      onProgress?: (progress: TrainingProgress) => void;
      rank?: number;
      alpha?: number;
      validationThreshold?: number;
    }
  ): Promise<{ weights: Record<string, number[]>; metrics: TrainingMetrics }>;
}
