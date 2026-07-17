import { DistributedInferenceEngine } from '../DistributedInferenceEngine.js';
export declare class AIRuntimeSimulation {
    private nodes;
    constructor();
    runDemoSequence(): Promise<{
        localOutput: string;
        remoteOutput: string;
        distributedOutput: string;
        offlineBlocked: boolean;
        multiModelResponse: string;
    }>;
    getNode(name: string): DistributedInferenceEngine | undefined;
}
