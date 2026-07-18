import { TrainingMetrics } from '../types/index.js';

export interface ITrainingBackend {
  readonly id: string;
  Initialize(): Promise<void>;
  Prepare(jobId: string, datasetPath: string, modelId: string, config: any): Promise<void>;
  Train(jobId: string, onProgress: (metrics: TrainingMetrics) => void): Promise<any>;
  Pause(jobId: string): Promise<boolean>;
  Resume(jobId: string): Promise<boolean>;
  Checkpoint(jobId: string, name: string): Promise<string>;
  Evaluate(modelId: string, datasetPath: string, metrics: string[]): Promise<Record<string, number>>;
  Export(modelId: string, exportType: string, targetDir: string): Promise<string>;
  Dispose(): Promise<void>;
}
