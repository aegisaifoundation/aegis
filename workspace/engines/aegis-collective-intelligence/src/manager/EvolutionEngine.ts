import { KnowledgeObject, EvolutionStatus } from '../types/index.js';

export class EvolutionEngine {
  private activeList = new Set<string>();
  private archivedList = new Set<string>();
  private retiredList = new Set<string>();

  evaluateKnowledgeLifecycle(objs: KnowledgeObject[]): EvolutionStatus {
    const now = new Date();
    for (const obj of objs) {
      if (obj.trustScore < 0.4) {
        this.retiredList.add(obj.id);
        this.activeList.delete(obj.id);
      } else if (obj.evidenceCount > 5) {
        // Promote/Merge
        this.activeList.add(obj.id);
      } else if (now.getTime() - obj.createdAt.getTime() > 120000) {
        this.archivedList.add(obj.id);
        this.activeList.delete(obj.id);
      } else {
        this.activeList.add(obj.id);
      }
    }

    return {
      totalKnowledgeObjects: objs.length,
      activeCount: this.activeList.size,
      archivedCount: this.archivedList.size,
      retiredCount: this.retiredList.size,
      lastEvaluated: now
    };
  }

  isRetired(id: string): boolean {
    return this.retiredList.has(id);
  }
}
