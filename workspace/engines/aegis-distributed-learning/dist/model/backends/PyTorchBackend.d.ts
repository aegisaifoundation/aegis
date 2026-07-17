import { ITrainingBackend } from '../ITrainingBackend.js';
import { TrainingMetrics, TrainingProgress } from '../../types/index.js';
export declare class PyTorchBackend implements ITrainingBackend {
    private readonly workspacePath?;
    readonly id = "pytorch";
    constructor(workspacePath?: string | undefined);
    train(modelId: string, dataset: any, config: {
        epochs: number;
        learningRate?: number;
        batchSize?: number;
        checkpointFrequency?: number;
        onProgress?: (progress: TrainingProgress) => void;
        rank?: number;
        alpha?: number;
        validationThreshold?: number;
    }): Promise<{
        weights: Record<string, number[]>;
        metrics: TrainingMetrics;
    }>;
}
//# sourceMappingURL=PyTorchBackend.d.ts.map