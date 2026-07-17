import { ReasoningTask, ReasoningResponse } from '../types/index.js';
import type { ConsensusManager } from './ConsensusManager.js';

export class ReasoningManager {
  constructor(private readonly consensusManager: ConsensusManager) {}

  async splitTask(prompt: string): Promise<string[]> {
    const subtasks: string[] = [];
    if (prompt.toLowerCase().includes('analysis') || prompt.toLowerCase().includes('medical')) {
      subtasks.push('Perform Medical OCR document scan');
      subtasks.push('Fetch Clinical Guidelines knowledge package');
      subtasks.push('Analyze clinical diagnostic reasoning');
    } else {
      subtasks.push(prompt);
    }
    return subtasks;
  }

  async runReasoning(
    prompt: string,
    nodes: string[],
    consensusMechanism: 'majority' | 'weighted_trust' | 'weighted_reputation' | 'contribution' = 'majority'
  ): Promise<{ response: string; consensusScore: number; votes: { nodeId: string; approve: boolean; confidence: number }[] }> {
    const subtasks = await this.splitTask(prompt);
    console.log(`[ReasoningManager] Task split: main task mapped to ${subtasks.length} subtask(s)`);

    const responses: ReasoningResponse[] = [];
    for (const nodeId of nodes) {
      responses.push({
        nodeId,
        responseText: `[Sovereign Node ${nodeId}] Locally analyzed context for task: "${prompt}"`,
        confidence: 0.88 + Math.random() * 0.1,
        signature: `sig-reasoning:${nodeId}:${Date.now()}`
      });
    }

    const votes = responses.map(r => ({
      nodeId: r.nodeId,
      approve: r.confidence > 0.85,
      confidence: r.confidence
    }));

    const consensus = this.consensusManager.evaluateConsensus(votes, consensusMechanism);

    const compiledResponse = responses.map(r => r.responseText).join('\n');
    return {
      response: compiledResponse,
      consensusScore: consensus.consensusScore,
      votes
    };
  }
}
