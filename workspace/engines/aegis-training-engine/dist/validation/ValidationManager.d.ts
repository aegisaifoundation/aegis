import { TrainingJob } from '../types/index.js';
export declare class ValidationManager {
    private workspaceRoot;
    constructor(workspaceRoot?: string);
    ValidateTraining(job: TrainingJob): Promise<boolean>;
}
export declare const validationManager: ValidationManager;
export default validationManager;
