import { ExperienceObject } from '../types/index.js';

export class InsightGenerator {

  generateInsights(experiences: ExperienceObject[]): string[] {
    const insights: string[] = [];
    if (experiences.length === 0) return insights;

    const successful = experiences.filter(e => e.outcome === 'success');
    const successRate = successful.length / experiences.length;
    insights.push(`Overall platform task success rate: ${(successRate * 100).toFixed(1)}%`);

    // Tools analysis
    const toolCounts = new Map<string, { count: number; success: number }>();
    for (const exp of experiences) {
      for (const t of exp.toolsUsed) {
        const stats = toolCounts.get(t) || { count: 0, success: 0 };
        stats.count++;
        if (exp.outcome === 'success') stats.success++;
        toolCounts.set(t, stats);
      }
    }

    for (const [tool, stats] of toolCounts.entries()) {
      const toolSuccessRate = stats.success / stats.count;
      if (toolSuccessRate > 0.8) {
        insights.push(`Tool [${tool}] performs exceptionally well with ${stats.success}/${stats.count} successes.`);
      }
    }

    return insights;
  }
}
