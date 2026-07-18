import { ITrainingBackend } from './ITrainingBackend.js';
import { TrainingMetrics } from '../types/index.js';
declare abstract class SimulatedBackend implements ITrainingBackend {
    abstract readonly id: string;
    protected preparedData: any;
    Initialize(): Promise<void>;
    Prepare(jobId: string, datasetPath: string, modelId: string, config: any): Promise<void>;
    Train(jobId: string, onProgress: (metrics: TrainingMetrics) => void): Promise<any>;
    Pause(jobId: string): Promise<boolean>;
    Resume(jobId: string): Promise<boolean>;
    Checkpoint(jobId: string, name: string): Promise<string>;
    Evaluate(modelId: string, datasetPath: string, metrics: string[]): Promise<Record<string, number>>;
    Export(modelId: string, exportType: string, targetDir: string): Promise<string>;
    Dispose(): Promise<void>;
}
export declare class UnslothBackend extends SimulatedBackend {
    readonly id = "unsloth";
}
export declare class LlamaFactoryBackend extends SimulatedBackend {
    readonly id = "llama-factory";
}
export declare class HuggingFaceBackend extends SimulatedBackend {
    readonly id = "huggingface";
}
export declare class FutureBackend extends SimulatedBackend {
    readonly id = "future";
}
export {};
