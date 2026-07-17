export class OllamaBackend {
    id = 'ollama';
    async train(modelId, dataset, config) {
        console.log(`[OllamaBackend] Starting Ollama API training on model ${modelId}...`);
        const start = Date.now();
        let loss = 0.95;
        let accuracy = 0.12;
        const lr = config.learningRate ?? 1e-4;
        for (let epoch = 1; epoch <= config.epochs; epoch++) {
            // Simulate remote daemon API callback loops
            loss = Math.max(0.02, loss - lr * 10.5 + (Math.random() - 0.5) * 0.015);
            accuracy = Math.min(0.99, accuracy + lr * 9.5 + (Math.random() - 0.5) * 0.007);
            if (config.onProgress) {
                config.onProgress({
                    epoch,
                    totalEpochs: config.epochs,
                    loss,
                    accuracy,
                    elapsedMs: Date.now() - start,
                    cancelled: false
                });
            }
            await new Promise(r => setImmediate(r));
        }
        const weights = {
            'q_proj': Array.from({ length: 4 }, () => (Math.random() - 0.5) * 0.009),
            'v_proj': Array.from({ length: 4 }, () => (Math.random() - 0.5) * 0.009)
        };
        const metrics = {
            accuracy,
            loss,
            rounds: 1,
            participantCount: 1,
            epochsCompleted: config.epochs,
            timestamp: new Date()
        };
        return { weights, metrics };
    }
}
//# sourceMappingURL=OllamaBackend.js.map