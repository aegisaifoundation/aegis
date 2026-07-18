import { TrainingJob, TrainingConfig } from '../types/index.js';
import { ITrainingBackend } from '../backend/ITrainingBackend.js';
export declare class TrainingScheduler {
    private queue;
    private activeJob;
    private activeBackend;
    private workspaceRoot;
    constructor(backend: ITrainingBackend, workspaceRoot?: string);
    setBackend(backend: ITrainingBackend): void;
    CreateTrainingJob(datasetId: string, modelId: string, config: TrainingConfig): Promise<TrainingJob>;
    CancelTraining(jobId: string): Promise<boolean>;
    PauseTraining(jobId: string): Promise<boolean>;
    ResumeTraining(jobId: string): Promise<boolean>;
    getJob(jobId: string): TrainingJob | undefined;
    getQueue(): TrainingJob[];
    getHistory(): TrainingJob[];
    private findJob;
    private sortQueue;
    private processQueue;
}
