# AEGIS Training Engine (ATE)

The **AEGIS Training Engine (ATE)** is a modular, high-performance local training subsystem designed to execute machine learning optimizations, fine-tune models (using LoRA, QLoRA, adapter architectures, or full fine-tuning), and output versioned, signed knowledge assets.

## Architecture

ATE maintains a clear division of responsibilities:
1. **TypeScript Orchestration**: Plugs into the AEGIS Runtime Kernel (`IEngine` lifecycle), manages scheduling queues, validates policy rules, indexes datasets, and coordinates output exports.
2. **Python Computational Service**: Spawns a line-buffered JSON-RPC execution bridge that runs numerical operations, loads neural networks, and evaluates checkpoints.
3. **C++ Native Indexing**: Runs native offset mapping to load massive local datasets without memory footprint issues.

```
       [ AEGIS Runtime ]
               │
               ▼
   [ TS Orchestration (ATE) ] ◄──► [ C++ Dataset Indexer ]
               │ (JSON-RPC)
               ▼
   [ Python Training Daemon ]
               │
               ▼
[ PyTorch / Transformers / PEFT ]
```

## Folder Structure

```
packages/aegis-training-engine/
├── cpp/
│   ├── CMakeLists.txt
│   └── dataset_indexer.cpp
├── python/
│   └── training_service.py
├── src/
│   ├── adapter/
│   │   └── TrainingEngineAdapter.ts
│   ├── backend/
│   │   ├── ITrainingBackend.ts
│   │   ├── PyTorchBackend.ts
│   │   └── PluggableBackends.ts
│   ├── checkpoint/
│   │   └── CheckpointManager.ts
│   ├── dataset/
│   │   └── DatasetManager.ts
│   ├── evaluation/
│   │   └── EvaluationManager.ts
│   ├── export/
│   │   └── ExportManager.ts
│   ├── interfaces/
│   │   └── index.ts
│   ├── model/
│   │   └── ModelManager.ts
│   ├── monitoring/
│   │   └── TrainingMonitor.ts
│   ├── optimization/
│   │   └── HyperparameterManager.ts
│   ├── policies/
│   │   └── PolicyManager.ts
│   ├── scheduler/
│   │   └── TrainingScheduler.ts
│   ├── services/
│   │   ├── GpuResourceManager.ts
│   │   └── PythonIpcBridge.ts
│   ├── simulation/
│   │   └── TrainingSimulation.ts
│   ├── test/
│   │   └── TrainingEngine.test.ts
│   ├── types/
│   │   └── index.ts
│   └── index.ts
├── engine.json
├── package.json
└── tsconfig.json
```

## Public APIs

ATE exposes the following interface:

- `CreateTrainingJob(datasetId, modelId, config)`: Creates and queues a new job.
- `CancelTraining(jobId)`: Halts and cancels execution.
- `PauseTraining(jobId)`: Pauses active training.
- `ResumeTraining(jobId)`: Resumes paused training.
- `TrainingStatus(jobId)`: Detailed job metrics and states.
- `EvaluateModel(modelId, datasetId, metrics)`: Evaluates model performance on a test split.
- `ExportLoRA(jobId, loraId)`: Packages and signs the final weights adapter.
- `ValidateTraining(jobId)`: Inspects training logs and final weights.
- `HardwareStatus()`: Telemetry of available GPU VRAM and CPU utilization.
- `TrainingQueue()`: Current scheduler queue.
