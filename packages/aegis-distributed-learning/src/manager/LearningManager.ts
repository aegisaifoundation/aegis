import type { ILearningStrategy } from '../strategy/ILearningStrategy.js';
import type { RoundManager } from './RoundManager.js';
import type { AggregationManager } from './AggregationManager.js';
import type { LearningCheckpointManager } from './LearningCheckpointManager.js';
import type { LearningVersionManager } from './LearningVersionManager.js';
import type { LoRAManager } from '../model/LoRAManager.js';
import type { PrivacyManager } from '../privacy/PrivacyManager.js';
import type { LearningPolicies } from '../policy/LearningPolicies.js';
import type {
  LearningState,
  LearningRound,
  AggregationResult,
  IStrategyContext
} from '../types/index.js';

/**
 * LearningManager
 *
 * Central coordinator for the Distributed Learning Engine.
 * Owns the top-level learning state machine and orchestrates all
 * sub-managers and the active ILearningStrategy.
 *
 * One active round at a time. All networking is delegated to the
 * ILearningStrategy which in turn uses IStrategyContext → DI services.
 */
export class LearningManager {
  private state: LearningState = 'IDLE';
  private strategies: Map<string, ILearningStrategy> = new Map();
  private activeStrategy: ILearningStrategy | null = null;
  private activeRound: LearningRound | null = null;
  private dis: any | null = null;
  private localNodeId: string = 'local';

  constructor(
    private readonly roundManager: RoundManager,
    private readonly aggregationManager: AggregationManager,
    private readonly checkpointManager: LearningCheckpointManager,
    private readonly versionManager: LearningVersionManager,
    private readonly loraManager: LoRAManager,
    private readonly privacyManager: PrivacyManager,
    private readonly policies: LearningPolicies
  ) {}

  /** Wire up the DI engine reference and node identity */
  initialize(dis: any | null, localNodeId: string): void {
    this.dis = dis;
    this.localNodeId = localNodeId;

    // Set round timeout callback
    this.roundManager.onTimeout = (round) => {
      console.warn(`[LearningManager] Round ${round.roundNumber} timed out. Checkpointing...`);
      this.checkpointManager.saveRoundCheckpoint(round).catch(() => {});
      this.state = 'IDLE';
      this.activeRound = null;
    };

    console.log(`[LearningManager] Initialized. Node: ${localNodeId}. DI: ${dis ? 'connected' : 'standalone'}`);
  }

  /** Register an ILearningStrategy implementation */
  registerStrategy(strategy: ILearningStrategy): void {
    this.strategies.set(strategy.name, strategy);
    console.log(`[LearningManager] Strategy registered: ${strategy.name}`);
  }

  /**
   * Initiate a new learning round.
   *
   * @param strategyName Which strategy to use ('federated' | 'swarm' | ...)
   * @param profileId    Optional learning profile ID
   */
  async startRound(strategyName = 'federated', profileId?: string): Promise<LearningRound> {
    if (this.state !== 'IDLE') {
      throw new Error(`[LearningManager] Cannot start round while in state: ${this.state}`);
    }

    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`[LearningManager] Unknown strategy: ${strategyName}. Registered: ${[...this.strategies.keys()].join(', ')}`);
    }

    this.activeStrategy = strategy;
    this.state = 'ROUND_ACTIVE';

    const round = this.roundManager.createRound(
      this.localNodeId,
      strategyName,
      this.policies.roundTimeoutMs,
      profileId
    );
    this.activeRound = round;

    console.log(`[LearningManager] Starting round ${round.roundNumber} using strategy: ${strategyName}`);

    try {
      await this._runRound(round, strategy);
    } catch (err: any) {
      console.error(`[LearningManager] Round ${round.roundNumber} failed: ${err.message}`);
      this.roundManager.failRound(round.roundId, err.message);
      this.state = 'IDLE';
      this.activeRound = null;
      throw err;
    }

    return round;
  }

  /** Stop the currently active round gracefully */
  async stopRound(): Promise<void> {
    if (!this.activeRound) return;
    const round = this.activeRound;
    console.log(`[LearningManager] Stopping round ${round.roundNumber}...`);
    await this.checkpointManager.saveRoundCheckpoint(round);
    this.roundManager.failRound(round.roundId, 'manually_stopped');
    this.state = 'IDLE';
    this.activeRound = null;
  }

  /** Join an externally-initiated round as a participant */
  async joinRound(roundId: string, leaderId: string): Promise<boolean> {
    if (this.state !== 'IDLE') return false;
    if (this.policies.requireTrustVerification && this.dis) {
      const trusted = await this.dis.trustService.verifyPeerTrust(leaderId);
      if (!trusted) {
        console.warn(`[LearningManager] Refused to join round from untrusted leader: ${leaderId}`);
        return false;
      }
    }
    const joined = this.roundManager.joinRound(roundId, this.localNodeId);
    if (joined) {
      this.state = 'ROUND_ACTIVE';
    }
    return joined;
  }

  /** Leave an active round gracefully */
  async leaveRound(): Promise<void> {
    if (!this.activeRound) return;
    this.roundManager.leaveRound(this.activeRound.roundId, this.localNodeId);
    this.state = 'IDLE';
    this.activeRound = null;
  }

  /** Pause the learning engine (flushes checkpoint) */
  async pauseLearning(): Promise<void> {
    if (this.state === 'PAUSED') return;
    if (this.activeRound) {
      await this.checkpointManager.saveRoundCheckpoint(this.activeRound);
    }
    this.state = 'PAUSED';
    console.log('[LearningManager] Paused.');
  }

  /** Resume from paused state */
  async resumeLearning(): Promise<void> {
    if (this.state !== 'PAUSED') return;
    this.state = this.activeRound ? 'ROUND_ACTIVE' : 'IDLE';
    console.log('[LearningManager] Resumed.');
  }

  /**
   * Hot-swap the active strategy without restarting the engine.
   * Cannot switch while a round is in progress.
   */
  async switchStrategy(name: string): Promise<void> {
    if (this.state === 'ROUND_ACTIVE' || this.state === 'AGGREGATING') {
      throw new Error('[LearningManager] Cannot switch strategy during an active round.');
    }
    const strategy = this.strategies.get(name);
    if (!strategy) throw new Error(`[LearningManager] Unknown strategy: ${name}`);
    this.activeStrategy = strategy;
    console.log(`[LearningManager] Active strategy switched to: ${name}`);
  }

  async shutdown(): Promise<void> {
    if (this.activeRound) {
      await this.checkpointManager.saveRoundCheckpoint(this.activeRound);
    }
    for (const strategy of this.strategies.values()) {
      await strategy.shutdown();
    }
    this.roundManager.shutdown();
    this.state = 'SHUTDOWN';
    console.log('[LearningManager] Shutdown complete.');
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  getState(): LearningState { return this.state; }
  getActiveRound(): LearningRound | null { return this.activeRound; }
  getRoundHistory(): LearningRound[] { return this.roundManager.getHistory(); }
  getActiveStrategyName(): string | null { return this.activeStrategy?.name ?? null; }
  getRegisteredStrategies(): string[] { return [...this.strategies.keys()]; }

  // ── Private ───────────────────────────────────────────────────────────────

  private _buildStrategyContext(): IStrategyContext {
    return {
      localNodeId: this.localNodeId,
      dis: this.dis,
      aggregationManager: this.aggregationManager,
      loraManager: this.loraManager,
      privacyManager: this.privacyManager,
      checkpointManager: this.checkpointManager,
      versionManager: this.versionManager
    };
  }

  private async _runRound(round: LearningRound, strategy: ILearningStrategy): Promise<void> {
    const ctx = this._buildStrategyContext();

    // 1. Prepare round
    this.roundManager.startCollection(round.roundId);
    await strategy.prepareRound(round);

    // 2. Discover and select participants
    let candidates: string[] = [];
    if (this.dis) {
      candidates = await this.dis.discoveryService.discoverNodes();
    }
    const selected = await strategy.selectParticipants(candidates);
    for (const nodeId of selected) {
      this.roundManager.joinRound(round.roundId, nodeId);
    }

    // 3. Exchange updates
    await strategy.exchangeUpdates(round);

    // 4. Aggregate
    this.state = 'AGGREGATING';
    this.roundManager.startAggregation(round.roundId);
    const result: AggregationResult = await strategy.aggregate(round);

    // 5. Validate
    const valid = await strategy.validate(result);
    if (!valid) {
      throw new Error(`Round ${round.roundNumber} aggregation result failed validation.`);
    }

    // 6. Publish
    await strategy.publishModel(result);

    // 7. Version the result
    this.versionManager.createVersion(
      `aggregation:${round.roundId}`,
      'aggregation',
      null,
      result.resultHash
    );
    this.versionManager.recordRound(round.roundId, round.roundNumber);

    // 8. Finalise
    await strategy.finishRound(round);
    this.roundManager.completeRound(round.roundId);

    this.state = 'IDLE';
    this.activeRound = null;

    console.log(`[LearningManager] Round ${round.roundNumber} completed successfully. Contributors: ${result.contributors.length}`);
  }
}
