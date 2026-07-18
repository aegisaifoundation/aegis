import { existsSync } from 'fs';
import path from 'path';
import fs from 'fs/promises';
import { TrainingJob } from '../types/index.js';

export class ValidationManager {
  private workspaceRoot: string;

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
  }

  async ValidateTraining(job: TrainingJob): Promise<boolean> {
    console.log(`[ValidationManager] Validating job status for: ${job.jobId}`);

    if (job.status !== 'COMPLETED') {
      console.warn(`[ValidationManager] Rejecting validation: job is in state "${job.status}" (expected "COMPLETED")`);
      return false;
    }

    if (job.metrics.length === 0) {
      console.warn('[ValidationManager] Rejecting validation: No training metrics recorded.');
      return false;
    }

    const finalLoss = job.metrics[job.metrics.length - 1]!.loss;
    if (finalLoss >= 2.2) {
      console.warn(`[ValidationManager] Rejecting validation: Final loss too high (${finalLoss.toFixed(3)}). Training unsuccessful.`);
      return false;
    }

    const checkpointDir = path.resolve(this.workspaceRoot, '.aegis/checkpoints', job.jobId, 'checkpoint-final');
    if (!existsSync(checkpointDir)) {
      console.warn(`[ValidationManager] Rejecting validation: Final checkpoint folder not found at: ${checkpointDir}`);
      return false;
    }

    const weightsFile = path.join(checkpointDir, 'adapter_model.safetensors');
    if (!existsSync(weightsFile)) {
      console.warn(`[ValidationManager] Rejecting validation: Weights file missing: ${weightsFile}`);
      return false;
    }

    const content = await fs.readFile(weightsFile, 'utf8');
    if (content.length === 0) {
      console.warn('[ValidationManager] Rejecting validation: Weights file is empty.');
      return false;
    }

    return true;
  }
}

export const validationManager = new ValidationManager();
export default validationManager;
