import { ITrainingBackend } from '../backend/ITrainingBackend.js';
import { TrainingJob } from '../types/index.js';
export declare class ExportManager {
    private activeBackend;
    private workspaceRoot;
    constructor(backend: ITrainingBackend, workspaceRoot?: string);
    setBackend(backend: ITrainingBackend): void;
    ExportLoRA(job: TrainingJob, exportName: string): Promise<string>;
    private computeSignature;
    private registerInAiRuntime;
    private publishToDistributedLearning;
}
