import { randomUUID } from 'crypto';
import { ExperienceObject } from '../types/index.js';

export class ExperienceEngine {
  private experiences = new Map<string, ExperienceObject>();

  recordExperience(
    taskId: string,
    goal: string,
    reasoningTrace: string[],
    toolsUsed: string[],
    modelsUsed: string[],
    policiesApplied: string[],
    outcome: 'success' | 'failure',
    executionTimeMs: number,
    successScore: number,
    confidence: number,
    feedback?: string
  ): ExperienceObject {
    const id = `exp-${randomUUID()}`;
    const exp: ExperienceObject = {
      id,
      taskId,
      goal,
      reasoningTrace,
      toolsUsed,
      modelsUsed,
      policiesApplied,
      outcome,
      executionTimeMs,
      successScore,
      confidence,
      feedback,
      timestamp: new Date()
    };

    this.experiences.set(id, exp);
    console.log(`[ExperienceEngine] Logged experience ${id} (successScore: ${successScore.toFixed(2)})`);
    return exp;
  }

  getExperience(id: string): ExperienceObject | undefined {
    return this.experiences.get(id);
  }

  listExperiences(): ExperienceObject[] {
    return Array.from(this.experiences.values());
  }
}
