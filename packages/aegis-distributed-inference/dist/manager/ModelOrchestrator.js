export class ModelOrchestrator {
    stages = [
        {
            stageName: 'Planner',
            modelId: 'llama-3',
            promptTemplate: (input) => `Planner: Outline the tasks to solve: "${input}"`
        },
        {
            stageName: 'Coder',
            modelId: 'llama-3',
            promptTemplate: (plan) => `Coder: Write mock implementation for the plan: "${plan}"`
        },
        {
            stageName: 'Critic',
            modelId: 'gpt-4o',
            promptTemplate: (code) => `Critic: Evaluate implementation security and correctness of: "${code}"`
        }
    ];
    /**
     * Run the multi-model sequential execution chain.
     */
    async executeOrchestrationWorkflow(inputPrompt, engine) {
        console.log(`[ModelOrchestrator] Initiating multi-model pipeline for input: "${inputPrompt.slice(0, 30)}..."`);
        const trajectory = [];
        let currentInput = inputPrompt;
        for (const stage of this.stages) {
            const prompt = stage.promptTemplate(currentInput);
            const result = await engine.Generate(prompt, { modelId: stage.modelId });
            trajectory.push({
                stage: stage.stageName,
                modelUsed: stage.modelId,
                result
            });
            currentInput = result;
        }
        const finalResponse = trajectory[trajectory.length - 1].result;
        return {
            response: finalResponse,
            trajectory
        };
    }
}
//# sourceMappingURL=ModelOrchestrator.js.map