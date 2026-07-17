import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';
import { LearningManager } from './manager/LearningManager.js';
import { ValidationManager } from './manager/ValidationManager.js';
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
    private validationManager;
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
    /** 1. Create a learning round */
    CreateLearningRound(strategyName?: string, profileId?: string): import("./index.js").LearningRound;
    /** 2. Join an externally-initiated round as a participant */
    JoinLearningRound(roundId: string, leaderId: string): Promise<boolean>;
    /** 3. Leave an active round gracefully */
    LeaveLearningRound(): Promise<void>;
    /** 4. Train model locally */
    TrainLocalModel(modelId: string, config: any): Promise<import("./index.js").TrainingMetrics>;
    /** 5. Pause local training */
    PauseTraining(): Promise<void>;
    /** 6. Resume training from checkpoint */
    ResumeTraining(modelId: string, config: any): Promise<any>;
    /** 7. Cancel running training job */
    CancelTraining(): Promise<void>;
    /** 8. Export LoRA adapter to a string blob */
    ExportLoRA(adapterId: string): string | null;
    /** 9. Import LoRA adapter from string blob */
    ImportLoRA(blob: string): import("./index.js").LoRAAdapter | null;
    /** 10. Merge LoRA adapter weights into base weights map */
    MergeLoRA(baseWeights: Record<string, number[]>, adapterId: string): Record<string, number[]>;
    /** 11. Validate incoming LoRA adapter */
    ValidateLoRA(adapter: any, roundConfig?: any): Promise<{
        valid: boolean;
        reason?: string;
    }>;
    /** 12. Aggregate weights from multiple contributors */
    AggregateUpdates(roundId: string, roundNumber: number, weightSets: Record<string, number[]>[], contributors: string[], algorithm?: string, options?: any): Promise<import("./index.js").AggregationResult>;
    /** 13. Get status of active round or round count */
    RoundStatus(roundId?: string): "IDLE" | import("./index.js").RoundStatus;
    /** 14. Get local training progress */
    TrainingStatus(): import("./index.js").TrainingProgress;
    /** 15. Get learning metrics */
    LearningMetrics(): {
        state: import("./index.js").LearningState;
        completedRounds: number;
        adaptersCount: number;
    };
    /** 16. Get learning version history */
    LearningHistory(entityId?: string): import("./index.js").VersionRecord[] | {
        roundId: string;
        roundNumber: number;
    }[];
    /** 17. Get list of checkpoints */
    CheckpointHistory(): {
        roundHistory: import("./index.js").LearningRound[];
    };
    /** Start a new distributed learning round (backward compatibility) */
    startRound(strategyName?: string, profileId?: string): Promise<import("./index.js").LearningRound>;
    /** Stop the currently active round (backward compatibility) */
    stopRound(): Promise<void>;
    /** Train a LoRA adapter locally (backward compatibility) */
    trainLoRA(modelId: string, config: any, epochs?: number): Promise<{
        adapterId: string;
        metrics: import("./index.js").TrainingMetrics;
    }>;
    /** Run a federated simulation (development/test) (backward compatibility) */
    runSimulation(strategy?: 'federated' | 'swarm', rounds?: number): Promise<import("./index.js").AggregationResult[]>;
    /** Access sub-managers directly */
    getLearningManager(): LearningManager;
    getLoRAManager(): LoRAManager;
    getModelManager(): ModelManager;
    getLocalTrainer(): LocalTrainer;
    getProfileRegistry(): LearningProfileRegistry;
    getPrivacyManager(): PrivacyManager;
    getValidationManager(): ValidationManager;
    getPolicies(): LearningPolicies;
    getSimulationMode(): SimulationMode | null;
}
export default DistributedLearningEngine;
//# sourceMappingURL=DistributedLearningEngine.d.ts.map