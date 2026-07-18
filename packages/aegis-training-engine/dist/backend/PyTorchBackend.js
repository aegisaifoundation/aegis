import { pythonIpcBridge } from '../services/PythonIpcBridge.js';
export class PyTorchBackend {
    id = 'pytorch';
    currentJobConfig = null;
    async Initialize() {
        await pythonIpcBridge.start();
    }
    async Prepare(jobId, datasetPath, modelId, config) {
        this.currentJobConfig = { jobId, datasetPath, modelId, config };
    }
    async Train(jobId, onProgress) {
        if (!this.currentJobConfig) {
            throw new Error('Backend not prepared.');
        }
        const progressListener = (eventName, data) => {
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
        }
        finally {
            pythonIpcBridge.off('event', progressListener);
        }
    }
    async Pause(jobId) {
        // Simply return success since backend supports pause orchestration
        return true;
    }
    async Resume(jobId) {
        return true;
    }
    async Checkpoint(jobId, name) {
        return `checkpoints/${jobId}/${name}`;
    }
    async Evaluate(modelId, datasetPath, metrics) {
        return await pythonIpcBridge.request('evaluate', {
            modelId,
            datasetPath,
            metrics
        });
    }
    async Export(modelId, exportType, targetDir) {
        return await pythonIpcBridge.request('export_lora', {
            loraId: modelId,
            targetDir
        });
    }
    async Dispose() {
        pythonIpcBridge.stop();
    }
}
export default PyTorchBackend;
//# sourceMappingURL=PyTorchBackend.js.map