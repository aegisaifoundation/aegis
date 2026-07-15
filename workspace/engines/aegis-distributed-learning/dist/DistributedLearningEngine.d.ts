import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';
import { LearningManager } from './manager/LearningManager.js';
import { ModelManager } from './model/ModelManager.js';
import { LoRAManager } from './model/LoRAManager.js';
import { LocalTrainer } from './model/LocalTrainer.js';
import { PrivacyManager } from './privacy/PrivacyManager.js';
import { LearningPolicies } from './policy/LearningPolicies.js';
import { LearningProfileRegistry } from './profile/LearningProfile.js';
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
export declare class DistributedLearningEngine implements IEngine {
    readonly metadata: IEngineMetadata;
    private context;
    private workspacePath;
    private policies;
    private roundManager;
    private aggregationManager;
    private checkpointManager;
    private versionManager;
    private modelManager;
    private loraManager;
    private localTrainer;
    private privacyManager;
    private profileRegistry;
    private learningManager;
    private simulationMode;
    private initStartTime;
    initialize(context: IRuntimeContext_v1): Promise<void>;
    configure(config: Record<string, any>): Promise<void>;
    start(): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    reload(): Promise<void>;
    shutdown(): Promise<void>;
    dispose(): Promise<void>;
    health(): Promise<EngineHealthReport>;
    /** Start a new distributed learning round */
    startRound(strategyName?: string, profileId?: string): Promise<import("./index.js").LearningRound>;
    /** Stop the currently active round */
    stopRound(): Promise<void>;
    /** Train a LoRA adapter locally */
    trainLoRA(modelId: string, config: any, epochs?: number): Promise<{
        adapterId: string;
        metrics: import("./index.js").TrainingMetrics;
    }>;
    /** Run a federated simulation (development/test) */
    runSimulation(strategy?: 'federated' | 'swarm', rounds?: number): Promise<import("./index.js").AggregationResult[]>;
    /** Access sub-managers directly */
    getLearningManager(): LearningManager;
    getLoRAManager(): LoRAManager;
    getModelManager(): ModelManager;
    getLocalTrainer(): LocalTrainer;
    getProfileRegistry(): LearningProfileRegistry;
    getPrivacyManager(): PrivacyManager;
    getPolicies(): LearningPolicies;
    getSimulationMode(): SimulationMode | null;
}
export default DistributedLearningEngine;
//# sourceMappingURL=DistributedLearningEngine.d.ts.map