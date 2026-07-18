import { ITrainingBackend } from '../backend/ITrainingBackend.js';
export declare class ModelManager {
    private activeBackend;
    constructor(backend: ITrainingBackend);
    setBackend(backend: ITrainingBackend): void;
    private getModelRegistry;
    LoadModel(modelId: string): Promise<boolean>;
    UnloadModel(modelId: string): Promise<boolean>;
    ListModels(): Promise<any[]>;
}
