import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';
import { serviceRegistry } from '@aegis/runtime';

import { TrainingJob, TrainingConfig, TrainingMetrics, HardwareStats } from '../types/index.js';
import { ITrainingBackend } from '../backend/ITrainingBackend.js';
import { PyTorchBackend } from '../backend/PyTorchBackend.js';
import { UnslothBackend, LlamaFactoryBackend, HuggingFaceBackend, FutureBackend } from '../backend/PluggableBackends.js';
import { DatasetManager } from '../dataset/DatasetManager.js';
import { ModelManager } from '../model/ModelManager.js';
import { TrainingScheduler } from '../scheduler/TrainingScheduler.js';
import { CheckpointManager } from '../checkpoint/CheckpointManager.js';
import { EvaluationManager } from '../evaluation/EvaluationManager.js';
import { ValidationManager } from '../validation/ValidationManager.js';
import { ExportManager } from '../export/ExportManager.js';
import { trainingMonitor } from '../monitoring/TrainingMonitor.js';
import { gpuResourceManager } from '../services/GpuResourceManager.js';
import { policyManager } from '../policies/PolicyManager.js';

export class TrainingEngineAdapter implements IEngine {
  readonly metadata: IEngineMetadata = {
    id: 'aegis-training-engine',
    displayName: 'AEGIS Training Engine',
    version: '1.0.0',
    kernelApiVersion: '1.0.0',
    dependencies: ['aegis-data', 'aegis-distributed-inference'],
    priority: 12,
    autoStart: true,
    singleton: true,
    permissions: ['fs:read', 'fs:write', 'process:spawn']
  };

  private context!: IRuntimeContext_v1;
  private isRunning = false;

  private activeBackend!: ITrainingBackend;
  private backends = new Map<string, ITrainingBackend>();

  private datasetManager!: DatasetManager;
  private modelManager!: ModelManager;
  private scheduler!: TrainingScheduler;
  private checkpointManager!: CheckpointManager;
  private evaluationManager!: EvaluationManager;
  private validationManager!: ValidationManager;
  private exportManager!: ExportManager;

  async initialize(context: IRuntimeContext_v1): Promise<void> {
    this.context = context;
    context.getLogger().info('Initializing AEGIS Training Engine (ATE)...', 'training');

    const workspaceRoot = context.getWorkspacePath();

    // Instantiate and register pluggable backends
    this.backends.set('pytorch', new PyTorchBackend());
    this.backends.set('unsloth', new UnslothBackend());
    this.backends.set('llama-factory', new LlamaFactoryBackend());
    this.backends.set('huggingface', new HuggingFaceBackend());
    this.backends.set('future', new FutureBackend());

    // Default to PyTorch
    this.activeBackend = this.backends.get('pytorch')!;

    // Instantiate managers
    this.datasetManager = new DatasetManager(workspaceRoot);
    this.modelManager = new ModelManager(this.activeBackend);
    this.scheduler = new TrainingScheduler(this.activeBackend, workspaceRoot);
    this.checkpointManager = new CheckpointManager(workspaceRoot);
    this.evaluationManager = new EvaluationManager(this.activeBackend);
    this.validationManager = new ValidationManager(workspaceRoot);
    this.exportManager = new ExportManager(this.activeBackend, workspaceRoot);

    // Wire up telemetry logger
    trainingMonitor.on('progress', (jobId, metrics) => {
      const job = this.scheduler.getJob(jobId);
      if (job) {
        job.logs.push(`[Epoch ${metrics.epoch} Step ${metrics.step}] Loss: ${metrics.loss.toFixed(4)} | Acc: ${metrics.accuracy?.toFixed(4) || 'N/A'}`);
      }
    });

    // Register engine and services
    serviceRegistry.register('aegis-training-engine', this);
    serviceRegistry.register('aegis-training-engine:scheduler', this.scheduler);
    serviceRegistry.register('aegis-training-engine:dataset', this.datasetManager);
    serviceRegistry.register('aegis-training-engine:model', this.modelManager);
    serviceRegistry.register('aegis-training-engine:policy', policyManager);
  }

  async configure(config: Record<string, any>): Promise<void> {
    this.context.getLogger().info('Configuring AEGIS Training Engine...', 'training');
    if (config.policy) {
      policyManager.setPolicy(config.policy);
    }
    if (config.backend && this.backends.has(config.backend)) {
      this.switchBackend(config.backend);
    }
  }

  async start(): Promise<void> {
    this.context.getLogger().info('Starting AEGIS Training Engine...', 'training');
    await this.activeBackend.Initialize();
    this.isRunning = true;
  }

  async shutdown(): Promise<void> {
    this.context.getLogger().info('Shutting down AEGIS Training Engine...', 'training');
    await this.activeBackend.Dispose();
    this.isRunning = false;
  }

  async pause(): Promise<void> {}
  async resume(): Promise<void> {}
  async reload(): Promise<void> {
    await this.shutdown();
    await this.start();
  }
  async dispose(): Promise<void> {
    await this.shutdown();
  }

  async health(): Promise<EngineHealthReport> {
    return {
      status: this.isRunning ? 'HEALTHY' : 'UNHEALTHY',
      latencyMs: 0,
      details: {
        activeBackend: this.activeBackend.id,
        queuedJobs: this.scheduler.getQueue().filter(j => j.status === 'QUEUED').length
      }
    };
  }

  // Helper to switch backend framework dynamically
  switchBackend(backendId: string) {
    const backend = this.backends.get(backendId);
    if (!backend) {
      throw new Error(`Unsupported training backend: ${backendId}`);
    }
    this.activeBackend = backend;
    this.modelManager.setBackend(backend);
    this.scheduler.setBackend(backend);
    this.evaluationManager.setBackend(backend);
    this.exportManager.setBackend(backend);
    this.context.getLogger().info(`Switched training backend to: ${backendId}`, 'training');
  }

  // ==========================================================================
  // Public APIs
  // ==========================================================================

  async CreateTrainingJob(datasetId: string, modelId: string, config: TrainingConfig): Promise<TrainingJob> {
    if (config.backend) {
      this.switchBackend(config.backend);
    }
    return await this.scheduler.CreateTrainingJob(datasetId, modelId, config);
  }

  async CancelTraining(jobId: string): Promise<boolean> {
    return await this.scheduler.CancelTraining(jobId);
  }

  async PauseTraining(jobId: string): Promise<boolean> {
    return await this.scheduler.PauseTraining(jobId);
  }

  async ResumeTraining(jobId: string): Promise<boolean> {
    return await this.scheduler.ResumeTraining(jobId);
  }

  async TrainingStatus(jobId: string): Promise<TrainingJob> {
    const job = this.scheduler.getJob(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);
    return job;
  }

  async TrainingMetrics(jobId: string): Promise<TrainingMetrics[]> {
    return trainingMonitor.getMetrics(jobId);
  }

  async TrainingHistory(): Promise<TrainingJob[]> {
    return this.scheduler.getHistory();
  }

  async LoadModel(modelId: string): Promise<boolean> {
    return await this.modelManager.LoadModel(modelId);
  }

  async UnloadModel(modelId: string): Promise<boolean> {
    return await this.modelManager.UnloadModel(modelId);
  }

  async ListModels(): Promise<any[]> {
    return await this.modelManager.ListModels();
  }

  async LoadDataset(datasetId: string): Promise<any> {
    return await this.datasetManager.LoadDataset(datasetId);
  }

  DatasetStatus(datasetId: string): string {
    return this.datasetManager.DatasetStatus(datasetId);
  }

  async EvaluateModel(modelId: string, datasetId: string, metrics: string[] = ['loss', 'accuracy']): Promise<Record<string, number>> {
    const loadedDataset = await this.datasetManager.LoadDataset(datasetId);
    return await this.evaluationManager.EvaluateModel(modelId, loadedDataset.filePath, metrics);
  }

  async ExportModel(modelId: string, exportType: string): Promise<string> {
    // Check constraints
    const validation = policyManager.validateExport(exportType as any);
    if (!validation.valid) {
      throw new Error(`Export restricted: ${validation.reason}`);
    }
    return await this.activeBackend.Export(modelId, exportType, `${process.cwd()}/.aegis/exports/${modelId}`);
  }

  async ExportLoRA(jobId: string, loraId: string): Promise<string> {
    const job = this.scheduler.getJob(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);
    return await this.exportManager.ExportLoRA(job, loraId);
  }

  async ValidateTraining(jobId: string): Promise<boolean> {
    const job = this.scheduler.getJob(jobId);
    if (!job) return false;
    return await this.validationManager.ValidateTraining(job);
  }

  async CheckpointHistory(jobId: string): Promise<string[]> {
    const list = await this.checkpointManager.listCheckpoints(jobId);
    return list.map(cp => cp.name);
  }

  async HardwareStatus(): Promise<HardwareStats> {
    return await gpuResourceManager.getStatus();
  }

  async TrainingQueue(): Promise<TrainingJob[]> {
    return this.scheduler.getQueue();
  }

  async TrainingLogs(jobId: string): Promise<string[]> {
    const job = this.scheduler.getJob(jobId);
    return job ? job.logs : [];
  }
}

export default TrainingEngineAdapter;
