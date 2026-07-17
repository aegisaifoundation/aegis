export interface ExperienceNode {
  readonly taskId: string;
  readonly experienceId: string;
  readonly knowledgeId?: string;
  readonly outcome: string;
  readonly domain: string;
}

export class ExperienceGraph {
  private graph = new Map<string, ExperienceNode>();

  linkExperience(
    taskId: string,
    experienceId: string,
    domain: string,
    outcome: string,
    knowledgeId?: string
  ): void {
    this.graph.set(taskId, {
      taskId,
      experienceId,
      knowledgeId,
      outcome,
      domain
    });
  }

  getTrace(taskId: string): ExperienceNode | undefined {
    return this.graph.get(taskId);
  }

  listTraces(): ExperienceNode[] {
    return Array.from(this.graph.values());
  }
}
