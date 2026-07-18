export type JobStatus = 'PENDING' | 'QUEUED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface Hyperparameters {
  learningRate: number;
  batchSize: number;
  epochs: number;
  gradientAccumulationSteps: number;
  optimizer: 'adamw' | 'sgd' | 'adam' | 'adamw_8bit';
  scheduler: 'cosine' | 'linear' | 'constant';
  warmupRatio: number;
  weightDecay: number;
  gradientClipping: number;
  mixedPrecision: 'fp16' | 'bf16' | 'fp32';
  seed: number;
}

export interface TrainingConfig {
  hyperparameters: Partial<Hyperparameters>;
  backend: 'pytorch' | 'unsloth' | 'llama-factory' | 'huggingface' | 'future';
  device?: 'cpu' | 'cuda' | 'rocm';
  priority?: number; // Higher value = higher priority
  validationSplit?: number; // e.g. 0.1
  testSplit?: number; // e.g. 0.1
}

export interface TrainingMetrics {
  epoch: number;
  step: number;
  loss: number;
  accuracy?: number;
  perplexity?: number;
  bleu?: number;
  rouge?: number;
  f1?: number;
  precision?: number;
  recall?: number;
  tokenThroughput: number; // tokens/sec
  gpuUsagePercent?: number;
  vramUsageMb?: number;
  cpuUsagePercent?: number;
  ramUsageMb?: number;
  tempCelsius?: number;
  powerWatts?: number;
  elapsedSeconds: number;
  estimatedTimeRemainingSeconds?: number;
}

export interface TrainingJob {
  jobId: string;
  datasetId: string;
  modelId: string;
  config: TrainingConfig;
  status: JobStatus;
  progress: number; // 0 to 100
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  metrics: TrainingMetrics[];
  checkpoints: string[];
  logs: string[];
}

export interface HardwareStats {
  device: 'cpu' | 'cuda' | 'rocm';
  gpuCount: number;
  availableVramMb: number;
  totalVramMb: number;
  gpuUsagePercent: number;
  cpuUsagePercent: number;
  ramUsageMb: number;
  totalRamMb: number;
  temperatureCelsius: number;
  powerWatts: number;
}

export interface ExportMetadata {
  datasetVersion: string;
  modelVersion: string;
  nodeId: string;
  timestamp: string;
  signature: string;
  statistics: {
    finalLoss: number;
    trainingTimeSeconds: number;
    totalEpochs: number;
    samplesUsed: number;
  };
}

export interface TrainingPolicy {
  policyId: string;
  name: 'Offline Only' | 'Local Only' | 'Medical' | 'Enterprise' | 'Research' | 'Government' | 'Student';
  allowedModels: string[]; // Glob patterns or ids
  allowedDatasets: string[];
  allowedTrainingMethods: string[]; // e.g., ['lora', 'qlora']
  maxHardwareUsage: {
    maxGpus?: number;
    maxVramMb?: number;
    maxCpuUsagePercent?: number;
  };
  allowedExportTypes: ('lora' | 'qlora' | 'full' | 'adapter' | 'knowledge')[];
}
