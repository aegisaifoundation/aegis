# Developer Guide: How to Make Local Training Possible

This guide walks through configuring, preparing, and running a local model training job on your machine using the AEGIS Training Engine (ATE) and the AEGIS SDK.

---

## 1. Preparing the Local Environment

Ensure the following prerequisites are met:
1. **Node.js**: Version 18+ (with support for ESM).
2. **Platform Compilers**: Node-gyp build tools (e.g., MSBuild for Windows, make/g++ for Linux/macOS) if using native C++ wrappers.
3. **Training Engine Registration**: The training engine must be registered in the workspace registry.

Run the installer helper to register all default engines in your active workspace:
```bash
node register-default-engines.mjs
```

Verify that `aegis-training-engine` is listed and enabled:
```bash
node .\apps\aegis-cli\dist\index.js engine list
```

---

## 2. Ingesting and Preparing the Dataset

The local dataset must be structured as a **JSON Lines (`.jsonl`)** file where each line is a valid JSON object containing training properties.

Create a raw directory (e.g., `C:\aegis\data\mammography\`) and save a `dataset.jsonl` file:
```json
{"text": "Patient shows density score Category 3.", "label": "benign"}
{"text": "Malignant node discovered in right breast tissue.", "label": "malignant"}
```

In your application code, load and process the dataset through the SDK:
```typescript
import { AegisSDK } from '@aegis/sdk';

const aegis = await AegisSDK.initialize({ transport: 'loopback' });

// Register the dataset directory
const dataset = await aegis.createDataset('mammography-dataset', 'C:/aegis/data/mammography');
console.log('Dataset Ingested Status:', dataset.status); // Output: COMPLETED
```

---

## 3. Launching the Training Job

Start a training job specifying the dataset, target model, optimization backend framework (e.g., PyTorch), and hyperparameters:

```typescript
const job = await aegis.createTrainingJob('job-mammography-run-1', 'mammography-dataset', {
  backend: 'pytorch',
  hyperparameters: {
    epochs: 5,
    batchSize: 2,
    learningRate: 2e-4
  }
});

console.log('Training Job Created. Current Status:', job.status); // Output: RUNNING
```

---

## 4. Monitoring Telemetry

Listen to the microkernel event bus for real-time progress events:

```typescript
await aegis.subscribe('TrainingProgress', (progress) => {
  console.log(`Epoch ${progress.epoch} | Step ${progress.step} | Loss: ${progress.loss.toFixed(4)}`);
});
```

---

## 5. Exporting the LoRA Adapter Weights

Once the training job completes, export the optimized weight delta adapter (LoRA):

```typescript
// The export process packages weights as .safetensors, signs metadata, and registers it in the local AI Runtime
const exportPath = await aegis.exportLoRA('job-mammography-run-1', 'lora-mammography-v1');
console.log('LoRA adapter exported to:', exportPath);
```

You can now use `lora-mammography-v1` in the AI Runtime (`aegis.generate()`) to run streaming local inferences using your newly optimized weights.
