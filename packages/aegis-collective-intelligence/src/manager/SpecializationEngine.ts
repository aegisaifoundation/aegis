import type { ExpertiseManager } from './ExpertiseManager.js';

export class SpecializationEngine {
  constructor(private expertiseManager: ExpertiseManager) {}

  getSpecializationRole(): string {
    const profiles = this.expertiseManager.listProfiles();
    if (profiles.length === 0) return 'Generalist';

    // Find domain with highest expertiseScore
    let best = profiles[0];
    for (const p of profiles) {
      if (p.expertiseScore > best.expertiseScore) {
        best = p;
      }
    }

    if (best.expertiseScore > 0.4) {
      const capitalized = best.domain.charAt(0).toUpperCase() + best.domain.slice(1);
      return `${capitalized} Specialist`;
    }

    return 'Generalist';
  }
}
