import { ReputationMetrics } from '../types/index.js';

export class ReputationManager {
  private reputationStore = new Map<string, ReputationMetrics>();

  constructor(localNodeId: string) {
    this.reputationStore.set(localNodeId, this._defaultMetrics(localNodeId));
  }

  getReputation(nodeId: string): ReputationMetrics {
    let metrics = this.reputationStore.get(nodeId);
    if (!metrics) {
      metrics = this._defaultMetrics(nodeId);
      this.reputationStore.set(nodeId, metrics);
    }
    return metrics;
  }

  recordContribution(nodeId: string, success: boolean): void {
    const metrics = this.getReputation(nodeId);
    (metrics as any).contributionCount += 1;
    if (success) {
      metrics.trustScore = Math.min(1.0, metrics.trustScore + 0.01);
      metrics.packageQuality = Math.min(1.0, metrics.packageQuality + 0.02);
    } else {
      metrics.trustScore = Math.max(0.0, metrics.trustScore - 0.05);
      metrics.packageQuality = Math.max(0.0, metrics.packageQuality - 0.05);
    }
    console.log(`[ReputationManager] Contribution recorded for ${nodeId}. New trust score: ${metrics.trustScore.toFixed(4)}`);
  }

  recordReasoningOutcome(nodeId: string, accuracy: number): void {
    const metrics = this.getReputation(nodeId);
    metrics.reasoningAccuracy = (metrics.reasoningAccuracy * 4 + accuracy) / 5;
    metrics.trustScore = Math.min(1.0, metrics.trustScore + (accuracy - 0.5) * 0.02);
    console.log(`[ReputationManager] Reasoning evaluated for ${nodeId}. New reasoning accuracy: ${metrics.reasoningAccuracy.toFixed(4)}`);
  }

  recordAvailability(nodeId: string, available: boolean): void {
    const metrics = this.getReputation(nodeId);
    (metrics as any).participationRate += 1;
    const currentRate = metrics.availabilityRate;
    metrics.availabilityRate = available
      ? Math.min(1.0, currentRate * 0.95 + 0.05)
      : Math.max(0.0, currentRate * 0.95);
  }

  private _defaultMetrics(nodeId: string): ReputationMetrics {
    return {
      nodeId,
      trustScore: 0.8,
      contributionCount: 5,
      learningCount: 2,
      availabilityRate: 0.9,
      validationAccuracy: 0.85,
      knowledgeQuality: 0.8,
      reasoningAccuracy: 0.85,
      packageQuality: 0.8,
      participationRate: 0.85
    };
  }
}
