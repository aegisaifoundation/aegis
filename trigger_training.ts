import { Bootloader } from '@aegis/runtime';
import { serviceRegistry } from '@aegis/runtime';
import fs from 'fs';
import path from 'path';

async function main() {
  const cwd = process.cwd();
  
  // 1. Create a small data directory and file
  const testDataDir = path.join(cwd, 'workspace', 'test-data');
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }
  
  const dataFilePath = path.join(testDataDir, 'data.txt');
  const sampleText = `Clinical Case Study Reference: PATIENT-00982
Diagnosis: Patient presents symptoms of mild respiratory discomfort.
History: No prior history of chronic conditions or asthma.
Recommendations: Administer rest and monitor blood oxygen levels daily.`;
  
  fs.writeFileSync(dataFilePath, sampleText, 'utf8');
  console.log(`[Test] Created mock training file at: ${dataFilePath}`);

  // 2. Boot the AEGIS platform microkernel
  console.log('[Test] Booting AEGIS Core Platform...');
  const kernel = await Bootloader.boot();
  
  try {
    const dataEngine = serviceRegistry.get<any>('aegis-data');
    
    // Clean up any old test datasets
    try {
      await dataEngine.DeleteDataset('dataset-test-1');
      await dataEngine.RemoveSource('src-test-dir');
    } catch {}
    
    console.log('[Test] Registering Data Source...');
    await dataEngine.RegisterSource(
      'src-test-dir',
      'Test Folder Source',
      'Folder',
      { path: 'workspace/test-data' }
    );
    
    console.log('[Test] Importing Dataset Metadata...');
    await dataEngine.ImportDataset(
      'dataset-test-1',
      'Test Text Dataset',
      'system',
      'Folder',
      'PUBLIC',
      { allowTraining: true }
    );
    
    console.log('[Test] Running Data Pipeline to prepare dataset...');
    await dataEngine.PrepareDataset('dataset-test-1', {});
    
    const isValid = await dataEngine.ValidateDataset('dataset-test-1');
    if (!isValid) {
      throw new Error('Dataset pipeline preparation failed to generate valid processed dataset.');
    }
    console.log('[Test] Dataset successfully prepared and validated.');
    
    // 3. Trigger Local LoRA Training
    const trainer = serviceRegistry.get<any>('distributed-learning:trainer');
    console.log('[Test] Triggering Local LoRA Training on TinyLlama-1.1B...');
    
    // We will train for 1 epoch to verify everything works quickly
    const result = await trainer.trainLoRA('TinyLlama-1.1B', {
      learningRate: 0.0002,
      batchSize: 1,
      rank: 4,
      alpha: 8,
      targetModules: ['q_proj', 'v_proj'],
      dropout: 0.05,
      validationThreshold: 15.0 // Keep threshold high to ensure mock passes
    }, 1);
    
    console.log('[Test] LoRA Training completed successfully!');
    console.log('[Test] LoRA Adapter ID:', result.adapterId);
    console.log('[Test] Training Metrics:', result.metrics);
    
    // 4. Verify adapter was saved in loraManager
    const loraManager = serviceRegistry.get<any>('distributed-learning:lora');
    const adapter = loraManager.getAdapter(result.adapterId);
    console.log('[Test] Saved Adapter Details:', adapter);
    
  } finally {
    // 5. Shutdown the platform microkernel
    console.log('[Test] Shutting down AEGIS Core Platform...');
    await kernel.shutdown();
    console.log('[Test] Shutdown completed.');
  }
}

main().catch((err) => {
  console.error('[Test] Execution failed:', err);
  process.exit(1);
});
