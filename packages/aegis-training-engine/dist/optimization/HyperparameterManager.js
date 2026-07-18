export class HyperparameterManager {
    defaultParams = {
        learningRate: 2e-4,
        batchSize: 4,
        epochs: 3,
        gradientAccumulationSteps: 4,
        optimizer: 'adamw_8bit',
        scheduler: 'cosine',
        warmupRatio: 0.03,
        weightDecay: 0.01,
        gradientClipping: 1.0,
        mixedPrecision: 'fp16',
        seed: 42
    };
    getDefaults() {
        return { ...this.defaultParams };
    }
    getProfile(profileName) {
        const base = this.getDefaults();
        switch (profileName) {
            case 'speed':
                return {
                    ...base,
                    learningRate: 3e-4,
                    batchSize: 8,
                    gradientAccumulationSteps: 2,
                    optimizer: 'adamw',
                    mixedPrecision: 'bf16'
                };
            case 'quality':
                return {
                    ...base,
                    learningRate: 5e-5,
                    batchSize: 2,
                    epochs: 5,
                    gradientAccumulationSteps: 8,
                    optimizer: 'adamw',
                    mixedPrecision: 'fp32'
                };
            case 'low_vram':
                return {
                    ...base,
                    learningRate: 1e-4,
                    batchSize: 1,
                    gradientAccumulationSteps: 16,
                    optimizer: 'adamw_8bit',
                    mixedPrecision: 'fp16'
                };
            case 'clinical':
                return {
                    ...base,
                    learningRate: 2e-5,
                    epochs: 4,
                    batchSize: 2,
                    gradientAccumulationSteps: 4,
                    weightDecay: 0.05
                };
            default:
                return base;
        }
    }
    validate(params) {
        const errors = [];
        if (params.learningRate !== undefined && (params.learningRate <= 0 || params.learningRate > 1e-1)) {
            errors.push('Learning rate must be positive and less than 0.1.');
        }
        if (params.batchSize !== undefined && (params.batchSize <= 0 || !Number.isInteger(params.batchSize))) {
            errors.push('Batch size must be a positive integer.');
        }
        if (params.epochs !== undefined && (params.epochs <= 0 || !Number.isInteger(params.epochs))) {
            errors.push('Epochs must be a positive integer.');
        }
        if (params.gradientAccumulationSteps !== undefined && (params.gradientAccumulationSteps <= 0 || !Number.isInteger(params.gradientAccumulationSteps))) {
            errors.push('Gradient accumulation steps must be a positive integer.');
        }
        if (params.warmupRatio !== undefined && (params.warmupRatio < 0 || params.warmupRatio > 1)) {
            errors.push('Warmup ratio must be between 0 and 1.');
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
}
export const hyperparameterManager = new HyperparameterManager();
export default hyperparameterManager;
//# sourceMappingURL=HyperparameterManager.js.map