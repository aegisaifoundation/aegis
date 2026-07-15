import { serviceRegistry } from '@aegis/runtime';
import { PyTorchBackend } from './backends/PyTorchBackend.js';
import { LlamaCppBackend } from './backends/LlamaCppBackend.js';
import { OllamaBackend } from './backends/OllamaBackend.js';
import { FutureBackend } from './backends/FutureBackend.js';
/**
 * LocalTrainer
 *
 * Coordinates local model training on this node.
 * Routes training tasks to the selected ITrainingBackend simulator,
 * loading datasets solely through the AEGIS Data Engine (ADE).
 */
export class LocalTrainer {
    loraManager;
    checkpointManager;
    isRunning = false;
    isCancelled = false;
    progress = {
        epoch: 0,
        totalEpochs: 0,
        loss: 1.0,
        accuracy: 0.0,
        elapsedMs: 0,
        cancelled: false
    };
    backends = new Map();
    activeBackendId = 'pytorch';
    constructor(loraManager, checkpointManager) {
        this.loraManager = loraManager;
        this.checkpointManager = checkpointManager;
        this.backends.set('pytorch', new PyTorchBackend());
        this.backends.set('llamacpp', new LlamaCppBackend());
        this.backends.set('ollama', new OllamaBackend());
        this.backends.set('future', new FutureBackend());
    }
    setBackend(backendId) {
        if (!this.backends.has(backendId)) {
            throw new Error(`[LocalTrainer] Unknown training backend: ${backendId}`);
        }
        this.activeBackendId = backendId;
    }
    getBackend() {
        return this.backends.get(this.activeBackendId) || this.backends.get('pytorch');
    }
    /**
     * Query the AEGIS Data Engine (ADE) for a prepared dataset.
     * Enforces that the engine never reads files directly.
     */
    async getPreparedDataset(modelId) {
        const dataEngine = serviceRegistry.has('aegis-data')
            ? serviceRegistry.get('aegis-data')
            : null;
        if (!dataEngine) {
            console.warn('[LocalTrainer] Data Engine (ADE) not registered. Defaulting to fallback mock dataset.');
            return { datasetId: 'fallback-mock', samples: 100 };
        }
        try {
            const datasets = await dataEngine.ListDatasets();
            // Match dataset for this modelId if possible, or get latest prepared dataset
            const matched = datasets.find((d) => d.status === 'Processed' && d.policies?.allowTraining === true);
            if (matched) {
                const stats = await dataEngine.DatasetStatistics(matched.datasetId);
                return {
                    datasetId: matched.datasetId,
                    samples: matched.samples,
                    language: matched.language,
                    statistics: stats
                };
            }
        }
        catch (err) {
            console.warn(`[LocalTrainer] Error fetching prepared dataset: ${err.message}`);
        }
        return { datasetId: 'mock-clinical-001', samples: 200, statistics: { words: 5000 } };
    }
    /**
     * Train a base model using the active training backend.
     */
    async train(config) {
        this.isRunning = true;
        this.isCancelled = false;
        // Load prepared dataset from Data Engine (no direct file reads)
        const dataset = await this.getPreparedDataset(config.modelId);
        const backend = this.getBackend();
        const start = Date.now();
        let startEpoch = 0;
        let initialWeights;
        // Resume from checkpoint if specified
        if (config.resumeCheckpointId) {
            const checkpoint = this.checkpointManager.restoreTrainingCheckpoint(config.resumeCheckpointId);
            if (checkpoint) {
                startEpoch = checkpoint.epoch;
                initialWeights = checkpoint.weights;
                console.log(`[LocalTrainer] Resuming from checkpoint ${config.resumeCheckpointId} at epoch ${startEpoch}`);
            }
        }
        this.progress = {
            epoch: startEpoch,
            totalEpochs: config.epochs,
            loss: 1.0,
            accuracy: 0.1,
            elapsedMs: 0,
            cancelled: false
        };
        const freq = config.checkpointFrequency ?? 5;
        try {
            const trainResult = await backend.train(config.modelId, dataset, {
                epochs: config.epochs - startEpoch,
                learningRate: config.learningRate,
                batchSize: config.batchSize,
                checkpointFrequency: freq,
                onProgress: (progress) => {
                    if (this.isCancelled) {
                        progress.cancelled = true;
                    }
                    this.progress = {
                        ...progress,
                        epoch: startEpoch + progress.epoch
                    };
                    if (this.progress.epoch % freq === 0) {
                        this.checkpointManager.saveTrainingCheckpoint(this.progress.epoch, trainResult?.weights || {});
                    }
                }
            });
            this.isRunning = false;
            return trainResult.metrics;
        }
        catch (err) {
            this.isRunning = false;
            throw err;
        }
    }
    /**
     * Fine-tune a LoRA adapter for the specified model.
     */
    async trainLoRA(modelId, loraConfig, epochs = 3) {
        this.isRunning = true;
        this.isCancelled = false;
        const adapter = this.loraManager.createAdapter(modelId, loraConfig);
        const dataset = await this.getPreparedDataset(modelId);
        const backend = this.getBackend();
        const result = await backend.train(modelId, dataset, {
            epochs,
            onProgress: (progress) => {
                if (this.isCancelled) {
                    progress.cancelled = true;
                }
                this.progress = progress;
            }
        });
        this.loraManager.updateAdapterWeights(adapter.id, result.weights);
        this.isRunning = false;
        console.log(`[LocalTrainer] LoRA training complete. Adapter: ${adapter.id}, accuracy=${result.metrics.accuracy.toFixed(4)}`);
        return { adapterId: adapter.id, metrics: result.metrics };
    }
    /** Evaluate a model against a simulated dataset */
    async evaluate(modelId, _datasetSize = 1000) {
        return {
            accuracy: 0.87 + (Math.random() - 0.5) * 0.04,
            loss: 0.31 + (Math.random() - 0.5) * 0.03,
            rounds: 0,
            participantCount: 1,
            epochsCompleted: 0,
            timestamp: new Date()
        };
    }
    /** Cancel the currently running training job */
    cancel(reason = 'user_requested') {
        if (!this.isRunning)
            return;
        this.isCancelled = true;
        this.progress.cancelled = true;
        console.log(`[LocalTrainer] Training cancelled: ${reason}`);
    }
    /** Get current training progress */
    getProgress() {
        return { ...this.progress };
    }
    isTraining() {
        return this.isRunning;
    }
}
//# sourceMappingURL=LocalTrainer.js.map