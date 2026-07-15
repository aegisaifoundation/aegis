import type { DistributedInferenceEngine } from '../DistributedInferenceEngine.js';

export interface WorkflowStage {
  readonly stageName: string;
  readonly modelId: string;
  readonly promptTemplate: (input: string) => string;
}

export class ModelOrchestrator {
  private stages: WorkflowStage[] = [
    {
      stageName: 'Planner',
      modelId: 'llama-3',
      promptTemplate: (input: string) => `Planner: Outline the tasks to solve: "${input}"`
    },
    {
      stageName: 'Coder',
      modelId: 'llama-3',
      promptTemplate: (plan: string) => `Coder: Write mock implementation for the plan: "${plan}"`
    },
    {
      stageName: 'Critic',
      modelId: 'gpt-4o',
      promptTemplate: (code: string) => `Critic: Evaluate implementation security and correctness of: "${code}"`
    }
  ];

  /**
   * Run the multi-model sequential execution chain.
   */
  async executeOrchestrationWorkflow(
    inputPrompt: string,
    engine: DistributedInferenceEngine
  ): Promise<{ response: string; trajectory: { stage: string; modelUsed: string; result: string }[] }> {
    console.log(`[ModelOrchestrator] Initiating multi-model pipeline for input: "${inputPrompt.slice(0, 30)}..."`);
    const trajectory: { stage: string; modelUsed: string; result: string }[] = [];
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
