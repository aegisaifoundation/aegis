import { ITrainingBackend } from '../backend/ITrainingBackend.js';
export declare class EvaluationManager {
    private activeBackend;
    constructor(backend: ITrainingBackend);
    setBackend(backend: ITrainingBackend): void;
    EvaluateModel(modelId: string, datasetPath: string, metrics?: string[]): Promise<Record<string, number>>;
}
