import { serviceRegistry } from '@aegis/runtime';
import os from 'os';
// Managers
import { LearningManager } from './manager/LearningManager.js';
import { RoundManager } from './manager/RoundManager.js';
import { AggregationManager } from './manager/AggregationManager.js';
import { LearningCheckpointManager } from './manager/LearningCheckpointManager.js';
import { LearningVersionManager } from './manager/LearningVersionManager.js';
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
export class DistributedLearningEngine {
    metadata = {
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
    context;
    workspacePath;
    // Sub-managers (initialised in initialize())
    policies;
    roundManager;
    aggregationManager;
    checkpointManager;
    versionManager;
    modelManager;
    loraManager;
    localTrainer;
    privacyManager;
    profileRegistry;
    learningManager;
    // Simulation (active when DI is unavailable)
    simulationMode = null;
    initStartTime = 0;
    async initialize(context) {
        this.initStartTime = Date.now();
        this.context = context;
        this.workspacePath = context.getWorkspacePath();
        console.log('[DistributedLearningEngine] Initializing...');
        // Provision sub-managers
        this.policies = new LearningPolicies();
        this.roundManager = new RoundManager();
        this.aggregationManager = new AggregationManager();
        this.checkpointManager = new LearningCheckpointManager(this.workspacePath);
        this.versionManager = new LearningVersionManager();
        this.modelManager = new ModelManager();
        this.loraManager = new LoRAManager(this.workspacePath);
        this.localTrainer = new LocalTrainer(this.loraManager, this.checkpointManager);
        this.privacyManager = new PrivacyManager();
        this.profileRegistry = new LearningProfileRegistry(this.workspacePath);
        this.learningManager = new LearningManager(this.roundManager, this.aggregationManager, this.checkpointManager, this.versionManager, this.loraManager, this.privacyManager, this.policies);
        // Resolve DI Engine from registry (may be null in standalone mode)
        const dis = serviceRegistry.get('distributed-intelligence') ?? null;
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
            versionManager: this.versionManager
        };
        const federated = new FederatedLearningStrategy();
        const swarm = new SwarmLearningStrategy();
        const hierarchical = new HierarchicalStrategy();
        const gossip = new GossipStrategy();
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
        console.log(`[DistributedLearningEngine] Initialized in ${Date.now() - this.initStartTime}ms.`);
        console.log(`[DistributedLearningEngine] DI Engine: ${dis ? '✔ connected' : '✗ standalone (simulation mode active)'}`);
    }
    async configure(config) {
        this.policies.applyConfig(config);
    }
    async start() {
        // Advertise capabilities via DI if available
        const dis = serviceRegistry.get('distributed-intelligence') ?? null;
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
    async pause() {
        await this.learningManager.pauseLearning();
    }
    async resume() {
        await this.learningManager.resumeLearning();
    }
    async reload() {
        await this.shutdown();
        await this.start();
    }
    async shutdown() {
        await this.learningManager.shutdown();
        this.simulationMode = null;
        console.log('[DistributedLearningEngine] Shutdown.');
    }
    async dispose() {
        await this.shutdown();
    }
    async health() {
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
    /** Start a new distributed learning round */
    async startRound(strategyName, profileId) {
        return this.learningManager.startRound(strategyName ?? this.policies.defaultStrategy, profileId);
    }
    /** Stop the currently active round */
    async stopRound() { return this.learningManager.stopRound(); }
    /** Train a LoRA adapter locally */
    async trainLoRA(modelId, config, epochs) {
        return this.localTrainer.trainLoRA(modelId, config, epochs);
    }
    /** Run a federated simulation (development/test) */
    async runSimulation(strategy = 'federated', rounds = 1) {
        if (!this.simulationMode)
            this.simulationMode = new SimulationMode(4);
        return this.simulationMode.runMultiRound(rounds, strategy);
    }
    /** Access sub-managers directly */
    getLearningManager() { return this.learningManager; }
    getLoRAManager() { return this.loraManager; }
    getModelManager() { return this.modelManager; }
    getLocalTrainer() { return this.localTrainer; }
    getProfileRegistry() { return this.profileRegistry; }
    getPrivacyManager() { return this.privacyManager; }
    getPolicies() { return this.policies; }
    getSimulationMode() { return this.simulationMode; }
}
export default DistributedLearningEngine;
//# sourceMappingURL=DistributedLearningEngine.js.map