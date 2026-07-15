import { IAIBackend } from '../IAIBackend.js';
export declare class vLLMBackend implements IAIBackend {
    readonly id = "vllm";
    loadModel(modelId: string): Promise<boolean>;
    unloadModel(modelId: string): Promise<boolean>;
    generate(modelId: string, prompt: string): Promise<string>;
    stream(modelId: string, prompt: string, onChunk: (text: string) => void): Promise<void>;
    embeddings(modelId: string, text: string): Promise<number[]>;
    tokenize(modelId: string, text: string): Promise<number[]>;
    health(): Promise<'HEALTHY'>;
    metrics(): Record<string, number>;
}
