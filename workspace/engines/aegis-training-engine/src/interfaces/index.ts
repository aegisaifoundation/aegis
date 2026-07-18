import {
  TrainingJob,
  TrainingConfig,
  JobStatus,
  TrainingMetrics,
  HardwareStats,
  ExportMetadata
} from '../types/index.js';

export interface ITrainingEngine {
  // Public APIs
  CreateTrainingJob(datasetId: string, modelId: string, config: TrainingConfig): Promise<TrainingJob>;
  CancelTraining(jobId: string): Promise<boolean>;
  PauseTraining(jobId: string): Promise<boolean>;
  ResumeTraining(jobId: string): Promise<boolean>;
  TrainingStatus(jobId: string): Promise<TrainingJob>;
  TrainingMetrics(jobId: string): Promise<TrainingMetrics[]>;
  TrainingHistory(): Promise<TrainingJob[]>;
  
  LoadModel(modelId: string): Promise<boolean>;
  UnloadModel(modelId: string): Promise<boolean>;
  ListModels(): Promise<any[]>;
  
  LoadDataset(datasetId: string): Promise<any>;
  DatasetStatus(datasetId: string): string;
  
  EvaluateModel(modelId: string, datasetId: string, metrics: string[]): Promise<Record<string, number>>;
  ExportModel(modelId: string, exportType: string): Promise<string>;
  ExportLoRA(modelId: string, loraId: string): Promise<string>;
  ValidateTraining(jobId: string): Promise<boolean>;
  CheckpointHistory(jobId: string): Promise<string[]>;
  HardwareStatus(): Promise<HardwareStats>;
  TrainingQueue(): Promise<TrainingJob[]>;
  TrainingLogs(jobId: string): Promise<string[]>;
}
