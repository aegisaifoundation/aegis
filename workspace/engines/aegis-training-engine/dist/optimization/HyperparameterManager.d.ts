import { Hyperparameters } from '../types/index.js';
export declare class HyperparameterManager {
    private defaultParams;
    getDefaults(): Hyperparameters;
    getProfile(profileName: 'speed' | 'quality' | 'low_vram' | 'clinical'): Hyperparameters;
    validate(params: Partial<Hyperparameters>): {
        valid: boolean;
        errors: string[];
    };
}
export declare const hyperparameterManager: HyperparameterManager;
export default hyperparameterManager;
