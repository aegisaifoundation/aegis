import { IAIBackend } from '../IAIBackend.js';
export declare class OpenAIBackend implements IAIBackend {
    readonly id = "openai";
    private loadedModels;
    private genCount;
    loadModel(modelId: string, options?: any): Promise<boolean>;
    unloadModel(modelId: string): Promise<boolean>;
    generate(modelId: string, prompt: string, options?: any): Promise<string>;
    stream(modelId: string, prompt: string, onChunk: (text: string) => void, options?: any): Promise<void>;
    embeddings(modelId: string, text: string): Promise<number[]>;
    tokenize(modelId: string, text: string): Promise<number[]>;
    health(): Promise<'HEALTHY' | 'DEGRADED' | 'FAILED'>;
    metrics(): Record<string, number>;
}
