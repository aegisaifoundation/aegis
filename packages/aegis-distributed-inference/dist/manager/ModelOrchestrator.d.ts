import type { DistributedInferenceEngine } from '../DistributedInferenceEngine.js';
export interface WorkflowStage {
    readonly stageName: string;
    readonly modelId: string;
    readonly promptTemplate: (input: string) => string;
}
export declare class ModelOrchestrator {
    private stages;
    /**
     * Run the multi-model sequential execution chain.
     */
    executeOrchestrationWorkflow(inputPrompt: string, engine: DistributedInferenceEngine): Promise<{
        response: string;
        trajectory: {
            stage: string;
            modelUsed: string;
            result: string;
        }[];
    }>;
}
