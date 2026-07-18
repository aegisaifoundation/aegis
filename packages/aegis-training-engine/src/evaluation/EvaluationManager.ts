import { ITrainingBackend } from '../backend/ITrainingBackend.js';

export class EvaluationManager {
  private activeBackend: ITrainingBackend;

  constructor(backend: ITrainingBackend) {
    this.activeBackend = backend;
  }

  setBackend(backend: ITrainingBackend) {
    this.activeBackend = backend;
  }

  async EvaluateModel(
    modelId: string,
    datasetPath: string,
    metrics: string[] = ['loss', 'accuracy', 'perplexity']
  ): Promise<Record<string, number>> {
    console.log(`[EvaluationManager] Evaluating model "${modelId}" on dataset at: ${datasetPath}`);
    const results = await this.activeBackend.Evaluate(modelId, datasetPath, metrics);
    
    // Ensure all requested metrics are represented
    const finalResults: Record<string, number> = {};
    for (const metric of metrics) {
      finalResults[metric] = results[metric] !== undefined ? results[metric] : 0.0;
    }
    
    return finalResults;
  }
}
