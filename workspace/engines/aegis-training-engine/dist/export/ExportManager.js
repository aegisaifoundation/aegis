import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import crypto from 'crypto';
import { serviceRegistry } from '@aegis/runtime';
export class ExportManager {
    activeBackend;
    workspaceRoot;
    constructor(backend, workspaceRoot = process.cwd()) {
        this.activeBackend = backend;
        this.workspaceRoot = workspaceRoot;
    }
    setBackend(backend) {
        this.activeBackend = backend;
    }
    async ExportLoRA(job, exportName) {
        console.log(`[ExportManager] Exporting LoRA adapter for job: ${job.jobId} under name: ${exportName}`);
        const exportDir = path.resolve(this.workspaceRoot, '.aegis/exports', exportName);
        if (!existsSync(exportDir)) {
            await fs.mkdir(exportDir, { recursive: true });
        }
        // Call backend to copy files
        await this.activeBackend.Export(job.jobId, 'lora', exportDir);
        // Compute stats
        const finalLoss = job.metrics[job.metrics.length - 1]?.loss || 0.0;
        const stats = {
            finalLoss,
            trainingTimeSeconds: job.metrics.length * 0.1,
            totalEpochs: job.metrics[job.metrics.length - 1]?.epoch || 0,
            samplesUsed: job.config.hyperparameters?.batchSize || 1
        };
        // Attach Signed Metadata
        const metadata = {
            datasetVersion: job.datasetId,
            modelVersion: job.modelId,
            nodeId: 'node-123',
            timestamp: new Date().toISOString(),
            signature: this.computeSignature(job.jobId, stats),
            statistics: stats
        };
        await fs.writeFile(path.join(exportDir, 'export_metadata.json'), JSON.stringify(metadata, null, 2), 'utf8');
        // Dynamic model registration in AI Runtime (distributed-inference)
        this.registerInAiRuntime(exportName, job.modelId);
        // Publish update to Distributed Learning Engine
        this.publishToDistributedLearning(exportName, metadata);
        return exportDir;
    }
    computeSignature(jobId, stats) {
        const raw = `${jobId}-${JSON.stringify(stats)}`;
        return crypto.createHmac('sha256', 'aegis-secret-key').update(raw).digest('hex');
    }
    registerInAiRuntime(loraId, baseModelId) {
        if (serviceRegistry.has('distributed-inference')) {
            const air = serviceRegistry.get('distributed-inference');
            const reg = air.modelRegistry || serviceRegistry.get('ModelRegistry');
            if (reg) {
                reg.registerModel({
                    id: loraId,
                    name: `LoRA: ${loraId}`,
                    version: '1.0.0',
                    hash: 'sha256:mockregisteredlorahash',
                    contextLength: 2048,
                    embeddingSize: 4096,
                    resourceRequirements: { cpu: 1, memoryMb: 512, gpu: true },
                    license: 'custom',
                    supportedTasks: ['text-generation', 'chat', 'tools']
                });
                console.log(`[ExportManager] Registered exported adapter "${loraId}" in AI Runtime.`);
            }
        }
    }
    publishToDistributedLearning(loraId, metadata) {
        if (serviceRegistry.has('aegis-distributed-learning')) {
            const dle = serviceRegistry.get('aegis-distributed-learning');
            if (dle && typeof dle.publishModelUpdate === 'function') {
                dle.publishModelUpdate(loraId, metadata);
                console.log(`[ExportManager] Published model update "${loraId}" to Distributed Learning Engine.`);
            }
        }
    }
}
//# sourceMappingURL=ExportManager.js.map