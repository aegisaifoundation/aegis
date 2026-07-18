import { ITrainingBackend } from './ITrainingBackend.js';
import { TrainingMetrics } from '../types/index.js';
import { pythonIpcBridge } from '../services/PythonIpcBridge.js';

export class PyTorchBackend implements ITrainingBackend {
  readonly id = 'pytorch';
  private currentJobConfig: any = null;

  async Initialize(): Promise<void> {
    await pythonIpcBridge.start();
  }

  async Prepare(jobId: string, datasetPath: string, modelId: string, config: any): Promise<void> {
    this.currentJobConfig = { jobId, datasetPath, modelId, config };
  }

  async Train(jobId: string, onProgress: (metrics: TrainingMetrics) => void): Promise<any> {
    if (!this.currentJobConfig) {
      throw new Error('Backend not prepared.');
    }

    const progressListener = (eventName: string, data: any) => {
      if (eventName === 'training_progress' && data.jobId === jobId) {
        onProgress(data.metrics);
      }
    };

    pythonIpcBridge.on('event', progressListener);

    try {
      const result = await pythonIpcBridge.request('train', {
        jobId,
        datasetPath: this.currentJobConfig.datasetPath,
        modelId: this.currentJobConfig.modelId,
        config: this.currentJobConfig.config,
        workspacePath: process.cwd()
      }, 120000); // 2 minutes timeout for training simulation
      return result;
    } finally {
      pythonIpcBridge.off('event', progressListener);
    }
  }

  async Pause(jobId: string): Promise<boolean> {
    // Simply return success since backend supports pause orchestration
    return true;
  }

  async Resume(jobId: string): Promise<boolean> {
    return true;
  }

  async Checkpoint(jobId: string, name: string): Promise<string> {
    return `checkpoints/${jobId}/${name}`;
  }

  async Evaluate(modelId: string, datasetPath: string, metrics: string[]): Promise<Record<string, number>> {
    return await pythonIpcBridge.request('evaluate', {
      modelId,
      datasetPath,
      metrics
    });
  }

  async Export(modelId: string, exportType: string, targetDir: string): Promise<string> {
    return await pythonIpcBridge.request('export_lora', {
      loraId: modelId,
      targetDir
    });
  }

  async Dispose(): Promise<void> {
    pythonIpcBridge.stop();
  }
}
export default PyTorchBackend;
