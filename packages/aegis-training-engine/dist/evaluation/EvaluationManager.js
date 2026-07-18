export class EvaluationManager {
    activeBackend;
    constructor(backend) {
        this.activeBackend = backend;
    }
    setBackend(backend) {
        this.activeBackend = backend;
    }
    async EvaluateModel(modelId, datasetPath, metrics = ['loss', 'accuracy', 'perplexity']) {
        console.log(`[EvaluationManager] Evaluating model "${modelId}" on dataset at: ${datasetPath}`);
        const results = await this.activeBackend.Evaluate(modelId, datasetPath, metrics);
        // Ensure all requested metrics are represented
        const finalResults = {};
        for (const metric of metrics) {
            finalResults[metric] = results[metric] !== undefined ? results[metric] : 0.0;
        }
        return finalResults;
    }
}
//# sourceMappingURL=EvaluationManager.js.map