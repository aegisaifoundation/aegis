import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { TrainingEngineAdapter } from '../adapter/TrainingEngineAdapter.js';
import { serviceRegistry } from '@aegis/runtime';

describe('AEGIS Training Engine (ATE) Tests', () => {
  const testDir = path.resolve(process.cwd(), '.test-aegis-training');
  const datasetId = 'test-dataset';
  let ate: TrainingEngineAdapter;

  const mockContext: any = {
    getWorkspacePath: () => testDir,
    getLogger: () => ({
      info: (msg: string) => {},
      warn: (msg: string) => {},
      error: (msg: string) => {}
    }),
    getConfig: () => ({}),
    getSecrets: () => ({}),
    getEventBus: () => ({
      emit: () => {}
    })
  };

  before(async () => {
    if (fs.existsSync(testDir)) {
      await fsPromises.rm(testDir, { recursive: true, force: true });
    }
    await fsPromises.mkdir(testDir, { recursive: true });

    // Create a mock processed dataset file in workspace
    const processedDir = path.join(testDir, '.aegis/datasets', datasetId, 'processed');
    await fsPromises.mkdir(processedDir, { recursive: true });
    
    const mockSamples = [
      { text: "sample 1 text", label: "oncology" },
      { text: "sample 2 text", label: "radiology" }
    ];
    const jsonlContent = mockSamples.map(s => JSON.stringify(s)).join('\n') + '\n';
    await fsPromises.writeFile(path.join(processedDir, 'dataset.jsonl'), jsonlContent, 'utf8');

    // Setup mock ModelRegistry inside distributed-inference
    const mockModelRegistry = {
      models: new Map(),
      registerModel(meta: any) {
        this.models.set(meta.id, meta);
      },
      listModels() {
        return Array.from(this.models.values());
      },
      getModel(id: string) {
        return this.models.get(id);
      }
    };
    serviceRegistry.register('distributed-inference', { modelRegistry: mockModelRegistry });

    // Initialize and start engine
    ate = new TrainingEngineAdapter();
    await ate.initialize(mockContext);
    await ate.start();
  });

  after(async () => {
    const { pythonIpcBridge } = await import('../services/PythonIpcBridge.js');
    pythonIpcBridge.stop();
    if (ate) {
      try {
        await ate.shutdown();
      } catch {}
    }
    if (fs.existsSync(testDir)) {
      await fsPromises.rm(testDir, { recursive: true, force: true });
    }
  });

  test('Metadata verification', () => {
    assert.strictEqual(ate.metadata.id, 'aegis-training-engine');
    assert.strictEqual(ate.metadata.displayName, 'AEGIS Training Engine');
    assert.ok(ate.metadata.permissions.includes('process:spawn'));
  });

  test('Hardware detection', async () => {
    const stats = await ate.HardwareStatus();
    assert.ok(stats.device === 'cpu' || stats.device === 'cuda' || stats.device === 'rocm');
    assert.ok(stats.totalRamMb > 0);
  });

  test('Dataset Loading and splits creation', async () => {
    const loaded = await ate.LoadDataset(datasetId);
    assert.strictEqual(loaded.datasetId, datasetId);
    assert.strictEqual(loaded.lineCount, 2);

    const splits = await serviceRegistry.get<any>('aegis-training-engine:dataset').SplitDataset(datasetId, 0.5, 0.5, 0.0);
    assert.ok(fs.existsSync(splits.trainPath));
    assert.ok(fs.existsSync(splits.valPath));
  });

  test('Backend switching', async () => {
    // Switch to pluggable simulated backend
    ate.switchBackend('unsloth');
    const health = await ate.health();
    assert.strictEqual(health.details?.activeBackend, 'unsloth');

    // Revert to pytorch (IPC default)
    ate.switchBackend('pytorch');
  });

  test('Hyperparameter profile loading', () => {
    const hyper = serviceRegistry.get<any>('aegis-training-engine:policy');
    assert.ok(hyper);
  });

  test('Full training job life-cycle simulation', async () => {
    try {
      const job = await ate.CreateTrainingJob(datasetId, 'llama-3', {
        backend: 'unsloth',
        hyperparameters: {
          epochs: 1,
          batchSize: 1
        },
        priority: 5
      });

      assert.ok(job.status === 'QUEUED' || job.status === 'RUNNING');
      
      // Wait for the scheduler to complete the simulation job
      let status = await ate.TrainingStatus(job.jobId);
      while (status.status === 'QUEUED' || status.status === 'RUNNING') {
        await new Promise(resolve => setTimeout(resolve, 100));
        status = await ate.TrainingStatus(job.jobId);
      }

      assert.strictEqual(status.status, 'COMPLETED');
      assert.strictEqual(status.progress, 100);

      // Validate Checkpoint
      const history = await ate.CheckpointHistory(job.jobId);
      assert.ok(history.includes('checkpoint-final'));

      // Validate evaluation
      const evalResults = await ate.EvaluateModel('llama-3', datasetId, ['loss', 'accuracy']);
      assert.ok(evalResults.loss !== undefined);

      // Validate integrity checks
      const isValid = await ate.ValidateTraining(job.jobId);
      assert.ok(isValid);

      // Validate exports
      const exportPath = await ate.ExportLoRA(job.jobId, 'test-lora-v1');
      assert.ok(fs.existsSync(path.join(exportPath, 'export_metadata.json')));
    } catch (err: any) {
      console.error("SIMULATION TEST EXCEPTION:", err);
      throw err;
    }
  });
});
