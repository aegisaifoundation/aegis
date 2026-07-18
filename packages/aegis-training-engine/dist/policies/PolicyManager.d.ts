import { TrainingPolicy, TrainingConfig } from '../types/index.js';
export declare class PolicyManager {
    private activePolicy;
    constructor(policyName?: TrainingPolicy['name']);
    setPolicy(policyName: TrainingPolicy['name']): void;
    getActivePolicy(): TrainingPolicy;
    validateJob(datasetId: string, modelId: string, config: TrainingConfig): {
        valid: boolean;
        reason?: string;
    };
    validateExport(exportType: 'lora' | 'qlora' | 'full' | 'adapter' | 'knowledge'): {
        valid: boolean;
        reason?: string;
    };
    private matchPattern;
    private getDefaultPolicy;
}
export declare const policyManager: PolicyManager;
export default policyManager;
