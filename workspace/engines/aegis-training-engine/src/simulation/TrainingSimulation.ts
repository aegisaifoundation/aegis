import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { serviceRegistry } from '@aegis/runtime';
import { TrainingEngineAdapter } from '../adapter/TrainingEngineAdapter.js';

export async function runSimulation() {
  console.log('='.repeat(60));
  console.log('           AEGIS TRAINING ENGINE (ATE) SIMULATION');
  console.log('='.repeat(60));

  const workspaceRoot = process.cwd();
  
  // 1. Create a mock processed dataset in workspace
  const datasetId = 'clinical-oncology-notes';
  const datasetDir = path.resolve(workspaceRoot, '.aegis/datasets', datasetId);
  const processedDir = path.join(datasetDir, 'processed');
  await fs.mkdir(processedDir, { recursive: true });

  const mockSamples = [
    { text: "Patient presents with stage II breast cancer. Suggesting chemotherapy.", label: "oncology" },
    { text: "No signs of metastasis in chest CT scan.", label: "radiology" },
    { text: "Prescribed 20mg Tamoxifen daily for 5 years.", label: "oncology" },
    { text: "Scheduled follow-up mammogram in 6 months.", label: "oncology" },
    { text: "Patient reported minor fatigue after initial radiation epoch.", label: "oncology" }
  ];

  const jsonlContent = mockSamples.map(s => JSON.stringify(s)).join('\n') + '\n';
  await fs.writeFile(path.join(processedDir, 'dataset.jsonl'), jsonlContent, 'utf8');
  console.log(`[Simulation] 1. Created mock dataset "${datasetId}" at: ${path.join(processedDir, 'dataset.jsonl')}`);

  // 2. Initialize a mock context
  const mockContext: any = {
    getWorkspacePath: () => workspaceRoot,
    getLogger: () => ({
      info: (msg: string) => console.log(`[Log Info] ${msg}`),
      warn: (msg: string) => console.log(`[Log Warn] ${msg}`),
      error: (msg: string) => console.log(`[Log Error] ${msg}`)
    }),
    getConfig: () => ({}),
    getSecrets: () => ({}),
    getEventBus: () => ({
      emit: (event: string, payload: any) => console.log(`[EventBus] ${event} emitted:`, payload)
    })
  };

  // Mock distributed-inference Registry to test runtime auto-registration
  const mockModelRegistry = {
    models: new Map(),
    registerModel(meta: any) {
      this.models.set(meta.id, meta);
      console.log(`[MockModelRegistry] Registered model: ${meta.id} (${meta.name})`);
    },
    listModels() {
      return Array.from(this.models.values());
    }
  };
  serviceRegistry.register('distributed-inference', { modelRegistry: mockModelRegistry });

  // 3. Initialize Training Engine Adapter
  const ate = new TrainingEngineAdapter();
  await ate.initialize(mockContext);
  await ate.start();
  console.log('[Simulation] 2. Training Engine initialized and started.');

  // 4. Create and run a Training Job
  console.log('[Simulation] 3. Creating and queueing training job...');
  const job = await ate.CreateTrainingJob(datasetId, 'llama-3', {
    backend: 'pytorch',
    hyperparameters: {
      epochs: 2,
      batchSize: 2,
      learningRate: 1e-4
    },
    priority: 10
  });

  console.log(`[Simulation] Job queued: ${job.jobId}. Waiting for completion...`);

  // Poll job status until complete
  let jobStatus = await ate.TrainingStatus(job.jobId);
  while (jobStatus.status === 'QUEUED' || jobStatus.status === 'RUNNING') {
    await new Promise(resolve => setTimeout(resolve, 300));
    jobStatus = await ate.TrainingStatus(job.jobId);
    console.log(`[Simulation] Progress: ${jobStatus.progress}% | Status: ${jobStatus.status}`);
  }

  if (jobStatus.status !== 'COMPLETED') {
    throw new Error(`Training failed: ${jobStatus.error}`);
  }
  console.log(`[Simulation] 4. Job successfully completed. Checkpoints saved:`, jobStatus.checkpoints);

  // 5. Evaluate the model
  console.log('[Simulation] 5. Running model evaluation on validation splits...');
  const evalMetrics = await ate.EvaluateModel('llama-3', datasetId, ['loss', 'accuracy', 'perplexity']);
  console.log('[Simulation] Evaluation outcomes:', evalMetrics);

  // 6. Validate the training
  console.log('[Simulation] 6. Validating training output weights and parameters...');
  const isValid = await ate.ValidateTraining(job.jobId);
  console.log('[Simulation] Validation successful:', isValid);

  // 7. Export the LoRA
  console.log('[Simulation] 7. Packaging and exporting LoRA adapter...');
  const loraId = 'lora-oncology-v1';
  const exportPath = await ate.ExportLoRA(job.jobId, loraId);
  console.log(`[Simulation] LoRA exported successfully to: ${exportPath}`);

  // Verify registration in model registry
  const models = mockModelRegistry.listModels();
  console.log(`[Simulation] Registered models in AI Runtime:`, models.map(m => m.id));

  // 8. Clean up mock directories
  await ate.shutdown();
  await fs.rm(datasetDir, { recursive: true, force: true });
  await fs.rm(path.resolve(workspaceRoot, '.aegis/checkpoints', job.jobId), { recursive: true, force: true });
  await fs.rm(path.resolve(workspaceRoot, '.aegis/exports', loraId), { recursive: true, force: true });
  
  console.log('='.repeat(60));
  console.log('           ATE SIMULATION SUCCESSFULLY COMPLETED');
  console.log('='.repeat(60));
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('TrainingSimulation.ts')) {
  runSimulation().catch(err => {
    console.error('[Simulation Error]', err);
    process.exit(1);
  });
}
