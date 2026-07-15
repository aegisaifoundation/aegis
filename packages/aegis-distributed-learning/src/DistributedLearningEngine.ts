import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';
import { serviceRegistry } from '@aegis/runtime';
import os from 'os';
import path from 'path';

// Managers
import { LearningManager } from './manager/LearningManager.js';
import { RoundManager } from './manager/RoundManager.js';
import { AggregationManager } from './manager/AggregationManager.js';
import { LearningCheckpointManager } from './manager/LearningCheckpointManager.js';
import { LearningVersionManager } from './manager/LearningVersionManager.js';
import { ValidationManager } from './manager/ValidationManager.js';

// Model layer
import { ModelManager } from './model/ModelManager.js';
import { LoRAManager } from './model/LoRAManager.js';
import { LocalTrainer } from './model/LocalTrainer.js';

// Privacy, Policy, Profile
import { PrivacyManager } from './privacy/PrivacyManager.js';
import { LearningPolicies } from './policy/LearningPolicies.js';
import { LearningProfileRegistry } from './profile/LearningProfile.js';

// Strategies
import { FederatedLearningStrategy } from './strategy/FederatedLearningStrategy.js';
import { SwarmLearningStrategy } from './strategy/SwarmLearningStrategy.js';
import { HierarchicalStrategy } from './strategy/HierarchicalStrategy.js';
import { GossipStrategy } from './strategy/GossipStrategy.js';

// Simulation
import { SimulationMode } from './simulation/SimulationMode.js';

/**
 * DistributedLearningEngine
 *
 * The learning layer of AEGIS. Owns everything related to distributed learning:
 *   - Training rounds (Federated, Swarm, future strategies)
 *   - LoRA adapter lifecycle
 *   - Model versioning
 *   - Secure aggregation
 *   - Checkpointing and recovery
 *   - Privacy policy enforcement
 *   - Learning profiles
 *
 * Does NOT own networking — all P2P work is delegated to the
 * Distributed Intelligence Engine via serviceRegistry.
 */
export class DistributedLearningEngine implements IEngine {
  readonly metadata: IEngineMetadata = {
    id: 'aegis-distributed-learning',
    displayName: 'Distributed Learning Engine',
    version: '1.0.0',
    kernelApiVersion: '1.0.0',
    dependencies: ['distributed-intelligence'],
    priority: 20,
    autoStart: true,
    singleton: true,
    permissions: ['fs:read', 'fs:write']
  };

  private context!: IRuntimeContext_v1;
  private workspacePath!: string;

  // Sub-managers (initialised in initialize())
  private policies!: LearningPolicies;
  private roundManager!: RoundManager;
  private aggregationManager!: AggregationManager;
  private checkpointManager!: LearningCheckpointManager;
  private versionManager!: LearningVersionManager;
  private modelManager!: ModelManager;
  private loraManager!: LoRAManager;
  private localTrainer!: LocalTrainer;
  private privacyManager!: PrivacyManager;
  private profileRegistry!: LearningProfileRegistry;
  private learningManager!: LearningManager;
  private validationManager!: ValidationManager;

  // Simulation (active when DI is unavailable)
  private simulationMode: SimulationMode | null = null;

  private initStartTime = 0;

  async initialize(context: IRuntimeContext_v1): Promise<void> {
    this.initStartTime = Date.now();
    this.context = context;
    this.workspacePath = context.getWorkspacePath();

    console.log('[DistributedLearningEngine] Initializing...');

    // Provision sub-managers
    this.policies           = new LearningPolicies();
    this.roundManager       = new RoundManager();
    this.aggregationManager = new AggregationManager();
    this.checkpointManager  = new LearningCheckpointManager(this.workspacePath);
    this.versionManager     = new LearningVersionManager();
    this.modelManager       = new ModelManager();
    this.loraManager        = new LoRAManager(this.workspacePath);
    this.localTrainer       = new LocalTrainer(this.loraManager, this.checkpointManager);
    this.privacyManager     = new PrivacyManager();
    this.profileRegistry    = new LearningProfileRegistry(this.workspacePath);
    this.validationManager  = new ValidationManager(this.loraManager);

    this.learningManager = new LearningManager(
      this.roundManager,
      this.aggregationManager,
      this.checkpointManager,
      this.versionManager,
      this.loraManager,
      this.privacyManager,
      this.policies
    );

    // Resolve DI Engine from registry (may be null in standalone mode)
    const dis = serviceRegistry.has('distributed-intelligence')
      ? serviceRegistry.get<any>('distributed-intelligence')
      : null;
    const nodeId = context.runtimeId ?? os.hostname();
    this.learningManager.initialize(dis, nodeId);

    // Register strategies
    const strategyCtx = {
      localNodeId: nodeId,
      dis,
      aggregationManager: this.aggregationManager,
      loraManager: this.loraManager,
      privacyManager: this.privacyManager,
      checkpointManager: this.checkpointManager,
      versionManager: this.versionManager,
      validationManager: this.validationManager
    };

    const federated = new FederatedLearningStrategy();
    const swarm     = new SwarmLearningStrategy();
    const hierarchical = new HierarchicalStrategy();
    const gossip    = new GossipStrategy();

    await federated.initialize(strategyCtx);
    await swarm.initialize(strategyCtx);
    await hierarchical.initialize(strategyCtx);
    await gossip.initialize(strategyCtx);

    this.learningManager.registerStrategy(federated);
    this.learningManager.registerStrategy(swarm);
    this.learningManager.registerStrategy(hierarchical);
    this.learningManager.registerStrategy(gossip);

    // Register in global service registry
    serviceRegistry.register('distributed-learning', this);
    serviceRegistry.register('distributed-learning:lora', this.loraManager);
    serviceRegistry.register('distributed-learning:trainer', this.localTrainer);
    serviceRegistry.register('distributed-learning:profiles', this.profileRegistry);
    serviceRegistry.register('distributed-learning:validation', this.validationManager);

    console.log(`[DistributedLearningEngine] Initialized in ${Date.now() - this.initStartTime}ms.`);
    console.log(`[DistributedLearningEngine] DI Engine: ${dis ? '✔ connected' : '✗ standalone (simulation mode active)'}`);
  }

  async configure(config: Record<string, any>): Promise<void> {
    this.policies.applyConfig(config);
  }

  async start(): Promise<void> {
    // Advertise capabilities via DI if available
    const dis = serviceRegistry.has('distributed-intelligence')
      ? serviceRegistry.get<any>('distributed-intelligence')
      : null;
    if (dis?.capabilityService) {
      await dis.capabilityService.advertiseCapabilities([
        'distributed_learning',
        'lora_training',
        'federated_learning',
        'swarm_learning',
        'secure_aggregation',
        'model_versioning',
        'checkpoint_recovery'
      ]);
      console.log('[DistributedLearningEngine] Capabilities advertised to network.');
    }

    // Activate simulation mode if DI is unavailable and policy allows
    if (!dis && this.policies.allowSimulationMode) {
      this.simulationMode = new SimulationMode(4);
      console.log('[DistributedLearningEngine] SimulationMode activated (4 mock nodes).');
    }

    console.log('[DistributedLearningEngine] Started.');
  }

  async pause(): Promise<void> {
    await this.learningManager.pauseLearning();
  }

  async resume(): Promise<void> {
    await this.learningManager.resumeLearning();
  }

  async reload(): Promise<void> {
    await this.shutdown();
    await this.start();
  }

  async shutdown(): Promise<void> {
    await this.learningManager.shutdown();
    this.simulationMode = null;
    console.log('[DistributedLearningEngine] Shutdown.');
  }

  async dispose(): Promise<void> {
    await this.shutdown();
  }

  async health(): Promise<EngineHealthReport> {
    const activeRound = this.learningManager.getActiveRound();
    return {
      status: 'HEALTHY',
      latencyMs: Date.now() - this.initStartTime,
      details: {
        state: this.learningManager.getState(),
        activeStrategy: this.learningManager.getActiveStrategyName(),
        registeredStrategies: this.learningManager.getRegisteredStrategies(),
        activeRoundId: activeRound?.roundId ?? null,
        totalRoundsCompleted: this.roundManager.getRoundCount(),
        loraAdapters: this.loraManager.getAdapterCount(),
        modelsRegistered: this.modelManager.getModelCount(),
        versionedEntities: this.versionManager.getEntityCount(),
        simulationModeActive: this.simulationMode !== null,
        simulationNodes: this.simulationMode?.getNodeCount() ?? 0
      }
    };
  }

  // ── Public API (consumed by other engines via serviceRegistry) ────────────

  /** 1. Create a learning round */
  CreateLearningRound(strategyName?: string, profileId?: string) {
    const leaderId = this.learningManager['localNodeId'] ?? 'local';
    return this.roundManager.createRound(
      leaderId,
      strategyName ?? this.policies.defaultStrategy,
      this.policies.roundTimeoutMs,
      profileId
    );
  }

  /** 2. Join an externally-initiated round as a participant */
  async JoinLearningRound(roundId: string, leaderId: string): Promise<boolean> {
    return this.learningManager.joinRound(roundId, leaderId);
  }

  /** 3. Leave an active round gracefully */
  async LeaveLearningRound(): Promise<void> {
    await this.learningManager.leaveRound();
  }

  /** 4. Train model locally */
  async TrainLocalModel(modelId: string, config: any) {
    if (config?.backend) {
      this.localTrainer.setBackend(config.backend);
    }
    return this.localTrainer.train({
      modelId,
      epochs: config?.epochs ?? 3,
      batchSize: config?.batchSize,
      learningRate: config?.learningRate,
      checkpointFrequency: config?.checkpointFrequency,
      resumeCheckpointId: config?.resumeCheckpointId
    });
  }

  /** 5. Pause local training */
  async PauseTraining(): Promise<void> {
    this.localTrainer.cancel('paused');
  }

  /** 6. Resume training from checkpoint */
  async ResumeTraining(modelId: string, config: any): Promise<any> {
    return this.TrainLocalModel(modelId, config);
  }

  /** 7. Cancel running training job */
  async CancelTraining(): Promise<void> {
    this.localTrainer.cancel('cancelled');
  }

  /** 8. Export LoRA adapter to a string blob */
  ExportLoRA(adapterId: string): string | null {
    return this.loraManager.exportAdapter(adapterId);
  }

  /** 9. Import LoRA adapter from string blob */
  ImportLoRA(blob: string) {
    return this.loraManager.importAdapter(blob);
  }

  /** 10. Merge LoRA adapter weights into base weights map */
  MergeLoRA(baseWeights: Record<string, number[]>, adapterId: string) {
    return this.loraManager.mergeAdapter(baseWeights, adapterId);
  }

  /** 11. Validate incoming LoRA adapter */
  async ValidateLoRA(adapter: any, roundConfig?: any) {
    const dis = serviceRegistry.has('distributed-intelligence')
      ? serviceRegistry.get<any>('distributed-intelligence')
      : null;
    return this.validationManager.validateLoRA(adapter, roundConfig, dis?.trustService);
  }

  /** 12. Aggregate weights from multiple contributors */
  async AggregateUpdates(
    roundId: string,
    roundNumber: number,
    weightSets: Record<string, number[]>[],
    contributors: string[],
    algorithm?: string,
    options?: any
  ) {
    return this.aggregationManager.aggregateWeights(
      roundId,
      roundNumber,
      weightSets,
      contributors,
      algorithm ?? this.policies.aggregationAlgorithm,
      options
    );
  }

  /** 13. Get status of active round or round count */
  RoundStatus(roundId?: string) {
    if (roundId) {
      return this.roundManager.getRound(roundId)?.status ?? 'PENDING';
    }
    const active = this.learningManager.getActiveRound();
    return active ? active.status : 'IDLE';
  }

  /** 14. Get local training progress */
  TrainingStatus() {
    return this.localTrainer.getProgress();
  }

  /** 15. Get learning metrics */
  LearningMetrics() {
    return {
      state: this.learningManager.getState(),
      completedRounds: this.roundManager.getRoundCount(),
      adaptersCount: this.loraManager.getAdapterCount()
    };
  }

  /** 16. Get learning version history */
  LearningHistory(entityId?: string) {
    if (entityId) {
      return this.versionManager.getHistory(entityId);
    }
    return this.versionManager.getRoundHistory();
  }

  /** 17. Get list of checkpoints */
  CheckpointHistory() {
    return {
      roundHistory: this.roundManager.getHistory()
    };
  }

  /** Start a new distributed learning round (backward compatibility) */
  async startRound(strategyName?: string, profileId?: string) {
    return this.learningManager.startRound(strategyName ?? this.policies.defaultStrategy, profileId);
  }

  /** Stop the currently active round (backward compatibility) */
  async stopRound() { return this.learningManager.stopRound(); }

  /** Train a LoRA adapter locally (backward compatibility) */
  async trainLoRA(modelId: string, config: any, epochs?: number) {
    return this.localTrainer.trainLoRA(modelId, config, epochs);
  }

  /** Run a federated simulation (development/test) (backward compatibility) */
  async runSimulation(strategy: 'federated' | 'swarm' = 'federated', rounds = 1) {
    if (!this.simulationMode) this.simulationMode = new SimulationMode(4);
    return this.simulationMode.runMultiRound(rounds, strategy);
  }

  /** Access sub-managers directly */
  getLearningManager()    { return this.learningManager; }
  getLoRAManager()        { return this.loraManager; }
  getModelManager()       { return this.modelManager; }
  getLocalTrainer()       { return this.localTrainer; }
  getProfileRegistry()    { return this.profileRegistry; }
  getPrivacyManager()     { return this.privacyManager; }
  getValidationManager()  { return this.validationManager; }
  getPolicies()           { return this.policies; }
  getSimulationMode()     { return this.simulationMode; }
}

export default DistributedLearningEngine;
