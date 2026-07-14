import { createHash, randomUUID } from 'crypto';
import type { AggregationResult, AuditRecord } from '../types/index.js';

/**
 * AggregationManager
 *
 * Responsible for securely combining updates from multiple participants.
 * Supports FedAvg (default) and is structured to accommodate FedProx
 * and future algorithms as plug-in strategies.
 *
 * Enforces contribution validity — rejected contributors are logged in the
 * immutable audit trail. Never exposes raw contributor data externally.
 */
export class AggregationManager {
  private rejectedUpdates: Map<string, { reason: string; timestamp: Date }> = new Map();
  private auditLog: AuditRecord[] = [];

  /**
   * Aggregate a set of weight maps using Federated Averaging (FedAvg).
   * All weight sets are assumed to be equal-importance (uniform weighting).
   *
   * @param roundId    Active round ID
   * @param roundNumber Round sequence number
   * @param weightSets Array of weight maps, one per contributor
   * @param contributors Ordered list of node IDs matching weightSets
   * @param algorithm  Aggregation algorithm (default: 'fedavg')
   */
  async aggregateWeights(
    roundId: string,
    roundNumber: number,
    weightSets: Record<string, number[]>[],
    contributors: string[],
    algorithm: 'fedavg' | 'fedprox' | string = 'fedavg'
  ): Promise<AggregationResult> {
    const validSets = weightSets.filter((_, i) => !this.rejectedUpdates.has(contributors[i]!));
    const validContributors = contributors.filter(id => !this.rejectedUpdates.has(id));

    if (validSets.length === 0) {
      throw new Error('[AggregationManager] No valid weight sets to aggregate.');
    }

    let aggregated: Record<string, number[]>;
    if (algorithm === 'fedprox') {
      aggregated = this._fedProx(validSets);
    } else {
      aggregated = this._fedAvg(validSets);
    }

    const resultHash = this._hashWeights(aggregated);

    const auditTrail = validContributors.map((nodeId, i) => this._auditRecord(
      'weight_contributed', roundId, nodeId, { index: i }
    ));

    auditTrail.push(this._auditRecord('aggregation_complete', roundId, 'system', {
      algorithm,
      contributorCount: validContributors.length,
      resultHash
    }));

    this.auditLog.push(...auditTrail);

    return {
      roundId,
      roundNumber,
      algorithm,
      contributors: validContributors,
      resultHash,
      auditTrail,
      completedAt: new Date()
    };
  }

  /**
   * Aggregate a set of LoRA delta tensor sets (same mechanism as weight aggregation
   * but semantically specific to LoRA adapters).
   */
  async aggregateLoRA(
    roundId: string,
    roundNumber: number,
    loraDeltas: Record<string, number[]>[],
    contributors: string[]
  ): Promise<AggregationResult> {
    return this.aggregateWeights(roundId, roundNumber, loraDeltas, contributors, 'fedavg');
  }

  /**
   * Mark a contributor's update as invalid — it will be excluded from aggregation.
   * The rejection is logged immutably.
   */
  rejectInvalidUpdate(nodeId: string, reason: string): void {
    this.rejectedUpdates.set(nodeId, { reason, timestamp: new Date() });
    const record = this._auditRecord('update_rejected', 'system', nodeId, { reason });
    this.auditLog.push(record);
    console.warn(`[AggregationManager] Rejected update from ${nodeId}: ${reason}`);
  }

  /**
   * Validate whether a node ID is a trusted contributor.
   * Delegates trust verification to the DI TrustService when provided.
   */
  async validateContributor(nodeId: string, diTrustService?: any): Promise<boolean> {
    if (this.rejectedUpdates.has(nodeId)) return false;
    if (diTrustService) {
      return diTrustService.verifyPeerTrust(nodeId);
    }
    return true;
  }

  /**
   * Stamp an aggregation result with a deterministic version hash.
   */
  versionResult(result: AggregationResult): string {
    const data = `${result.roundId}:${result.resultHash}:${result.completedAt.toISOString()}`;
    return createHash('sha256').update(data).digest('hex').slice(0, 16);
  }

  getAuditLog(): AuditRecord[] {
    return [...this.auditLog];
  }

  getRejectedUpdates(): Map<string, { reason: string; timestamp: Date }> {
    return new Map(this.rejectedUpdates);
  }

  clearRoundState(): void {
    this.rejectedUpdates.clear();
  }

  // ── Algorithms ────────────────────────────────────────────────────────────

  /** Federated Averaging: simple uniform mean across all weight sets */
  private _fedAvg(sets: Record<string, number[]>[]): Record<string, number[]> {
    const result: Record<string, number[]> = {};
    const keys = Object.keys(sets[0] ?? {});

    for (const key of keys) {
      const allVectors = sets.map(s => s[key] ?? []);
      const len = Math.max(...allVectors.map(v => v.length));
      result[key] = Array.from({ length: len }, (_, i) => {
        const sum = allVectors.reduce((acc, v) => acc + (v[i] ?? 0), 0);
        return sum / sets.length;
      });
    }
    return result;
  }

  /**
   * FedProx: Proximal term regularisation (μ = 0.01 default).
   * Pulls each update closer to the global before averaging,
   * improving convergence in heterogeneous data environments.
   */
  private _fedProx(sets: Record<string, number[]>[], mu = 0.01): Record<string, number[]> {
    const global = this._fedAvg(sets);
    const proxed = sets.map(s => {
      const result: Record<string, number[]> = {};
      for (const key of Object.keys(s)) {
        const g = global[key] ?? [];
        result[key] = (s[key] ?? []).map((w, i) => w - mu * (w - (g[i] ?? 0)));
      }
      return result;
    });
    return this._fedAvg(proxed);
  }

  private _hashWeights(weights: Record<string, number[]>): string {
    const serialised = JSON.stringify(weights, Object.keys(weights).sort());
    return createHash('sha256').update(serialised).digest('hex');
  }

  private _auditRecord(
    eventType: string,
    roundId: string,
    nodeId: string,
    detail: Record<string, any>
  ): AuditRecord {
    return {
      eventId: randomUUID(),
      eventType,
      roundId,
      nodeId,
      timestamp: new Date(),
      detail
    };
  }
}
