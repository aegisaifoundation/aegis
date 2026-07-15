import { ITrainingBackend } from '../ITrainingBackend.js';
import { TrainingMetrics, TrainingProgress } from '../../types/index.js';
export declare class LlamaCppBackend implements ITrainingBackend {
    readonly id = "llamacpp";
    train(modelId: string, dataset: any, config: {
        epochs: number;
        learningRate?: number;
        batchSize?: number;
        checkpointFrequency?: number;
        onProgress?: (progress: TrainingProgress) => void;
    }): Promise<{
        weights: Record<string, number[]>;
        metrics: TrainingMetrics;
    }>;
}
//# sourceMappingURL=LlamaCppBackend.d.ts.map