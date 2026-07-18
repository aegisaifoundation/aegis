import { TrainingPolicy, TrainingConfig } from '../types/index.js';

export class PolicyManager {
  private activePolicy: TrainingPolicy;

  constructor(policyName: TrainingPolicy['name'] = 'Local Only') {
    this.activePolicy = this.getDefaultPolicy(policyName);
  }

  setPolicy(policyName: TrainingPolicy['name']) {
    this.activePolicy = this.getDefaultPolicy(policyName);
  }

  getActivePolicy(): TrainingPolicy {
    return this.activePolicy;
  }

  validateJob(datasetId: string, modelId: string, config: TrainingConfig): { valid: boolean; reason?: string } {
    const policy = this.activePolicy;

    // Validate dataset
    const datasetAllowed = policy.allowedDatasets.some(pattern => this.matchPattern(datasetId, pattern));
    if (!datasetAllowed) {
      return { valid: false, reason: `Dataset "${datasetId}" is not allowed under the active "${policy.name}" policy.` };
    }

    // Validate model
    const modelAllowed = policy.allowedModels.some(pattern => this.matchPattern(modelId, pattern));
    if (!modelAllowed) {
      return { valid: false, reason: `Model "${modelId}" is not allowed under the active "${policy.name}" policy.` };
    }

    // Validate method (backend / method)
    const method = config.backend;
    const methodAllowed = policy.allowedTrainingMethods.some(pattern => this.matchPattern(method, pattern));
    if (!methodAllowed) {
      return { valid: false, reason: `Training method/backend "${method}" is not allowed under the active "${policy.name}" policy.` };
    }

    return { valid: true };
  }

  validateExport(exportType: 'lora' | 'qlora' | 'full' | 'adapter' | 'knowledge'): { valid: boolean; reason?: string } {
    const policy = this.activePolicy;
    if (!policy.allowedExportTypes.includes(exportType)) {
      return { valid: false, reason: `Export type "${exportType}" is restricted by the active "${policy.name}" policy.` };
    }
    return { valid: true };
  }

  private matchPattern(str: string, pattern: string): boolean {
    if (pattern === '*') return true;
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$', 'i');
      return regex.test(str);
    }
    return str.toLowerCase() === pattern.toLowerCase();
  }

  private getDefaultPolicy(name: TrainingPolicy['name']): TrainingPolicy {
    switch (name) {
      case 'Medical':
        return {
          policyId: 'policy-med-01',
          name: 'Medical',
          allowedModels: ['*llama-3*', '*clinical*', '*med*'],
          allowedDatasets: ['*patient*', '*clinical*', '*medical*', 'dataset-*'],
          allowedTrainingMethods: ['lora', 'qlora'],
          maxHardwareUsage: { maxGpus: 1, maxVramMb: 16384 },
          allowedExportTypes: ['lora', 'qlora', 'adapter']
        };
      case 'Enterprise':
        return {
          policyId: 'policy-ent-01',
          name: 'Enterprise',
          allowedModels: ['*'],
          allowedDatasets: ['*'],
          allowedTrainingMethods: ['lora', 'qlora', 'adapter', 'full'],
          maxHardwareUsage: { maxGpus: 4, maxVramMb: 65536 },
          allowedExportTypes: ['lora', 'qlora', 'full', 'adapter', 'knowledge']
        };
      case 'Government':
        return {
          policyId: 'policy-gov-01',
          name: 'Government',
          allowedModels: ['*gov*', '*secure*', '*llama-3*'],
          allowedDatasets: ['*gov*', '*secure*'],
          allowedTrainingMethods: ['lora', 'qlora'],
          maxHardwareUsage: { maxGpus: 2, maxVramMb: 32768 },
          allowedExportTypes: ['lora', 'qlora', 'adapter']
        };
      case 'Student':
        return {
          policyId: 'policy-std-01',
          name: 'Student',
          allowedModels: ['*small*', '*tiny*', '*2b*', '*3b*'],
          allowedDatasets: ['*mock*', '*sample*', '*student*'],
          allowedTrainingMethods: ['lora'],
          maxHardwareUsage: { maxGpus: 0, maxVramMb: 0 }, // CPU Only
          allowedExportTypes: ['lora']
        };
      case 'Offline Only':
      case 'Local Only':
      case 'Research':
      default:
        return {
          policyId: 'policy-local-01',
          name: 'Local Only',
          allowedModels: ['*'],
          allowedDatasets: ['*'],
          allowedTrainingMethods: ['*'],
          maxHardwareUsage: {},
          allowedExportTypes: ['lora', 'qlora', 'adapter', 'knowledge']
        };
    }
  }
}

export const policyManager = new PolicyManager();
export default policyManager;
