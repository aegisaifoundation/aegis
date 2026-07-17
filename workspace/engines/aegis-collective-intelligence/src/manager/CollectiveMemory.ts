import { KnowledgeObject, ExperienceObject } from '../types/index.js';

export class CollectiveMemory {
  private knowledgeStore = new Map<string, KnowledgeObject[]>(); // id -> version history
  private experienceStore = new Map<string, ExperienceObject>();

  storeKnowledge(obj: KnowledgeObject): void {
    let history = this.knowledgeStore.get(obj.id);
    if (!history) {
      history = [];
      this.knowledgeStore.set(obj.id, history);
    }
    history.push(obj);
    console.log(`[CollectiveMemory] Cached knowledge object ${obj.id} version ${obj.version}`);
  }

  storeExperience(exp: ExperienceObject): void {
    this.experienceStore.set(exp.id, exp);
  }

  getLatestKnowledge(id: string): KnowledgeObject | undefined {
    const history = this.knowledgeStore.get(id);
    return history ? history[history.length - 1] : undefined;
  }

  searchKnowledge(domain?: string, category?: string): KnowledgeObject[] {
    const results: KnowledgeObject[] = [];
    for (const history of this.knowledgeStore.values()) {
      const latest = history[history.length - 1];
      if (domain && latest.domain !== domain) continue;
      if (category && latest.category !== category) continue;
      results.push(latest);
    }
    return results;
  }

  listExperiences(): ExperienceObject[] {
    return Array.from(this.experienceStore.values());
  }
}
