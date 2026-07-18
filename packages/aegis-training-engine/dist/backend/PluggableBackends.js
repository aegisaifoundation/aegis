import fs from 'fs';
import path from 'path';
class SimulatedBackend {
    preparedData = null;
    async Initialize() {
        console.log(`[${this.id} Backend] Initialized framework interface.`);
    }
    async Prepare(jobId, datasetPath, modelId, config) {
        this.preparedData = { jobId, datasetPath, modelId, config };
        console.log(`[${this.id} Backend] Prepared training for ${modelId} with ${datasetPath}`);
    }
    async Train(jobId, onProgress) {
        console.log(`[${this.id} Backend] Starting training run loop...`);
        const epochs = this.preparedData?.config?.hyperparameters?.epochs || 1;
        const steps = epochs * 5;
        for (let step = 1; step <= steps; step++) {
            await new Promise(resolve => setTimeout(resolve, 30));
            onProgress({
                epoch: Math.ceil(step / 5),
                step,
                loss: 1.5 - (step * 0.1),
                accuracy: 0.5 + (step * 0.05),
                perplexity: 4.5 - (step * 0.2),
                tokenThroughput: 1400,
                elapsedSeconds: step * 0.1
            });
        }
        let workspaceRoot = process.cwd();
        const datasetPath = this.preparedData?.datasetPath;
        if (datasetPath) {
            const idx = datasetPath.indexOf('.aegis');
            if (idx !== -1) {
                workspaceRoot = datasetPath.substring(0, idx);
            }
        }
        const cpDir = path.resolve(workspaceRoot, '.aegis/checkpoints', jobId, 'checkpoint-final');
        if (!fs.existsSync(cpDir)) {
            fs.mkdirSync(cpDir, { recursive: true });
        }
        fs.writeFileSync(path.join(cpDir, 'adapter_model.safetensors'), JSON.stringify({ mock: true }), 'utf8');
        fs.writeFileSync(path.join(cpDir, 'adapter_config.json'), JSON.stringify({ mock_config: true }), 'utf8');
        fs.writeFileSync(path.join(cpDir, 'metadata.json'), JSON.stringify({
            jobId,
            name: 'checkpoint-final',
            epoch: epochs,
            step: steps,
            timestamp: new Date().toISOString(),
            metrics: { loss: 1.5 - (steps * 0.1), accuracy: 0.5 + (steps * 0.05) }
        }), 'utf8');
        return {
            status: 'COMPLETED',
            finalLoss: 1.5 - (steps * 0.1),
            finalAccuracy: 0.5 + (steps * 0.05),
            checkpoints: ['checkpoint-final']
        };
    }
    async Pause(jobId) {
        console.log(`[${this.id} Backend] Paused training.`);
        return true;
    }
    async Resume(jobId) {
        console.log(`[${this.id} Backend] Resumed training.`);
        return true;
    }
    async Checkpoint(jobId, name) {
        return `checkpoints/${jobId}/${name}`;
    }
    async Evaluate(modelId, datasetPath, metrics) {
        return { loss: 0.25, accuracy: 0.91 };
    }
    async Export(modelId, exportType, targetDir) {
        console.log(`[${this.id} Backend] Exported model adapter of type ${exportType}`);
        return targetDir;
    }
    async Dispose() {
        console.log(`[${this.id} Backend] Disposed resources.`);
    }
}
export class UnslothBackend extends SimulatedBackend {
    id = 'unsloth';
}
export class LlamaFactoryBackend extends SimulatedBackend {
    id = 'llama-factory';
}
export class HuggingFaceBackend extends SimulatedBackend {
    id = 'huggingface';
}
export class FutureBackend extends SimulatedBackend {
    id = 'future';
}
//# sourceMappingURL=PluggableBackends.js.map