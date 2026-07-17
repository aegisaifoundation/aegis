export interface ModelMetadata {
    readonly id: string;
    readonly name: string;
    readonly version: string;
    readonly hash: string;
    readonly contextLength: number;
    readonly embeddingSize: number;
    readonly quantization?: string;
    readonly resourceRequirements: {
        readonly cpu: number;
        readonly memoryMb: number;
        readonly gpu: boolean;
    };
    readonly license: string;
    readonly supportedTasks: string[];
}
export declare class ModelRegistry {
    private registry;
    constructor();
    registerModel(meta: ModelMetadata): void;
    getModel(modelId: string): ModelMetadata | undefined;
    listModels(): ModelMetadata[];
    removeModel(modelId: string): void;
}
