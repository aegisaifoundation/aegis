import type { CollectiveMemory } from './CollectiveMemory.js';

export interface ExecutionRecommendation {
  readonly suggestedModelId?: string;
  readonly suggestedToolId?: string;
  readonly suggestedWorkflowId?: string;
  readonly strategyReasoning: string;
}

export class RecommendationEngine {
  constructor(private memory: CollectiveMemory) {}

  generateRecommendations(prompt: string, domain: string): ExecutionRecommendation {
    const knowledgeList = this.memory.searchKnowledge(domain);

    if (knowledgeList.length > 0) {
      const bestKnowledge = knowledgeList[0];
      // Pick alternative settings from reasoning pattern if present
      return {
        suggestedModelId: bestKnowledge.reasoningPattern.includes('use_gpt_4o') ? 'gpt-4o' : 'llama-3',
        suggestedToolId: 'Medical_OCR_Tool_optimized',
        suggestedWorkflowId: 'Clinical_Guidelines_v2',
        strategyReasoning: `Leveraging collective experience from knowledge ${bestKnowledge.id}: ${bestKnowledge.summary}`
      };
    }

    // Default recommendation fallback
    return {
      suggestedModelId: 'llama-3',
      strategyReasoning: 'Standard default execution routing. No relevant collective knowledge found.'
    };
  }
}
