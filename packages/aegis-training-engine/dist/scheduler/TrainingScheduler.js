import crypto from 'crypto';
import path from 'path';
import { policyManager } from '../policies/PolicyManager.js';
import { hyperparameterManager } from '../optimization/HyperparameterManager.js';
import { trainingMonitor } from '../monitoring/TrainingMonitor.js';
export class TrainingScheduler {
    queue = [];
    activeJob = null;
    activeBackend;
    workspaceRoot;
    constructor(backend, workspaceRoot = process.cwd()) {
        this.activeBackend = backend;
        this.workspaceRoot = workspaceRoot;
    }
    setBackend(backend) {
        this.activeBackend = backend;
    }
    async CreateTrainingJob(datasetId, modelId, config) {
        // 1. Enforce policies
        const policyResult = policyManager.validateJob(datasetId, modelId, config);
        if (!policyResult.valid) {
            throw new Error(`Policy violation: ${policyResult.reason}`);
        }
        // 2. Validate hyperparameters
        const hyperResult = hyperparameterManager.validate(config.hyperparameters);
        if (!hyperResult.valid) {
            throw new Error(`Invalid hyperparameters: ${hyperResult.errors.join(', ')}`);
        }
        // Apply defaults for missing hyperparameters
        const mergedHyperparameters = {
            ...hyperparameterManager.getDefaults(),
            ...config.hyperparameters
        };
        const jobId = `job-${crypto.randomUUID()}`;
        const job = {
            jobId,
            datasetId,
            modelId,
            config: {
                ...config,
                hyperparameters: mergedHyperparameters
            },
            status: 'QUEUED',
            progress: 0,
            createdAt: new Date().toISOString(),
            metrics: [],
            checkpoints: [],
            logs: []
        };
        this.queue.push(job);
        this.sortQueue();
        console.log(`[TrainingScheduler] Created and queued job ${jobId} (priority: ${config.priority || 0})`);
        // Process next job asynchronously
        this.processQueue();
        return job;
    }
    async CancelTraining(jobId) {
        const job = this.findJob(jobId);
        if (!job)
            return false;
        if (job.status === 'RUNNING' || job.status === 'PAUSED') {
            // Terminate run
            await this.activeBackend.Dispose();
            job.status = 'CANCELLED';
            job.completedAt = new Date().toISOString();
            if (this.activeJob?.jobId === jobId) {
                this.activeJob = null;
            }
            console.log(`[TrainingScheduler] Cancelled active job ${jobId}`);
            this.processQueue();
        }
        else {
            job.status = 'CANCELLED';
            console.log(`[TrainingScheduler] Cancelled queued job ${jobId}`);
        }
        return true;
    }
    async PauseTraining(jobId) {
        const job = this.findJob(jobId);
        if (!job || job.status !== 'RUNNING')
            return false;
        const paused = await this.activeBackend.Pause(jobId);
        if (paused) {
            job.status = 'PAUSED';
            console.log(`[TrainingScheduler] Paused job ${jobId}`);
        }
        return paused;
    }
    async ResumeTraining(jobId) {
        const job = this.findJob(jobId);
        if (!job || job.status !== 'PAUSED')
            return false;
        const resumed = await this.activeBackend.Resume(jobId);
        if (resumed) {
            job.status = 'RUNNING';
            console.log(`[TrainingScheduler] Resumed job ${jobId}`);
        }
        return resumed;
    }
    getJob(jobId) {
        return this.findJob(jobId);
    }
    getQueue() {
        return [...this.queue];
    }
    getHistory() {
        return this.queue.filter(j => ['COMPLETED', 'FAILED', 'CANCELLED'].includes(j.status));
    }
    findJob(jobId) {
        return this.queue.find(j => j.jobId === jobId);
    }
    sortQueue() {
        this.queue.sort((a, b) => {
            // Run active jobs first, then order queued jobs by priority desc, then by date asc
            const statusWeight = (s) => (s === 'RUNNING' || s === 'PAUSED' ? 2 : s === 'QUEUED' ? 1 : 0);
            const weightA = statusWeight(a.status);
            const weightB = statusWeight(b.status);
            if (weightA !== weightB)
                return weightB - weightA;
            const priorityA = a.config.priority || 0;
            const priorityB = b.config.priority || 0;
            if (priorityA !== priorityB)
                return priorityB - priorityA;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
    }
    async processQueue() {
        if (this.activeJob) {
            // Concurrency limit is 1 active job to prevent VRAM overloads
            return;
        }
        const nextJob = this.queue.find(j => j.status === 'QUEUED');
        if (!nextJob)
            return;
        this.activeJob = nextJob;
        nextJob.status = 'RUNNING';
        nextJob.startedAt = new Date().toISOString();
        console.log(`[TrainingScheduler] Starting job ${nextJob.jobId} with backend "${nextJob.config.backend}"`);
        try {
            // Initialize backend
            await this.activeBackend.Initialize();
            // Resolve dataset splits paths
            const datasetSplitDir = path.resolve(this.workspaceRoot, '.aegis/datasets', nextJob.datasetId, 'processed/dataset.jsonl');
            await this.activeBackend.Prepare(nextJob.jobId, datasetSplitDir, nextJob.modelId, nextJob.config);
            // Execute training
            const runResult = await this.activeBackend.Train(nextJob.jobId, (metrics) => {
                nextJob.metrics.push(metrics);
                nextJob.progress = Math.round((metrics.step / (nextJob.config.hyperparameters?.epochs || 3)) * 10);
                nextJob.progress = Math.min(99, nextJob.progress); // Cap at 99% until completed
                trainingMonitor.recordMetrics(nextJob.jobId, metrics);
            });
            nextJob.status = 'COMPLETED';
            nextJob.progress = 100;
            nextJob.completedAt = new Date().toISOString();
            if (runResult && runResult.checkpoints) {
                nextJob.checkpoints = runResult.checkpoints;
            }
            console.log(`[TrainingScheduler] Successfully completed job ${nextJob.jobId}`);
        }
        catch (err) {
            nextJob.status = 'FAILED';
            nextJob.error = err.message || String(err);
            nextJob.completedAt = new Date().toISOString();
            console.error(`[TrainingScheduler] Job ${nextJob.jobId} failed:`, err);
        }
        finally {
            this.activeJob = null;
            this.sortQueue();
            // Schedule next item
            this.processQueue();
        }
    }
}
//# sourceMappingURL=TrainingScheduler.js.map