/**
 * @module types
 * Shared type definitions for the AEGIS Distributed Learning Engine.
 * All managers and strategies consume from this single source of truth.
 */
/** Overall state of the Distributed Learning Engine */
export type LearningState = 'IDLE' | 'ROUND_ACTIVE' | 'AGGREGATING' | 'PAUSED' | 'SHUTDOWN';
/** Lifecycle state of a single learning round */
export type RoundStatus = 'PENDING' | 'COLLECTING' | 'AGGREGATING' | 'COMPLETE' | 'FAILED' | 'TIMEOUT';
/** Model lifecycle state */
export type ModelLifecycleState = 'AVAILABLE' | 'TRAINING' | 'DEPRECATED' | 'ARCHIVED';
/** LoRA adapter transmission clearance */
export type TransmissionClearance = 'ALLOWED' | 'DENIED';
/** Configuration for creating a new LoRA adapter */
export interface LoRAConfig {
    /** Target rank for low-rank decomposition */
    rank: number;
    /** LoRA scaling factor (alpha) */
    alpha: number;
    /** Target module names (e.g., ['q_proj', 'v_proj']) */
    targetModules: string[];
    /** Dropout probability */
    dropout: number;
}
/** Represents a fully materialised LoRA adapter */
export interface LoRAAdapter {
    readonly id: string;
    readonly modelId: string;
    readonly version: string;
    readonly rank: number;
    readonly alpha: number;
    /** Absolute path to the adapter file on disk */
    readonly path: string;
    /** SHA-256 hash of the adapter file */
    readonly hash: string;
    /** ECDSA signature over the hash */
    readonly signature: string;
    readonly sizeBytes: number;
    readonly createdAt: Date;
    readonly metadata: Record<string, any>;
}
/** A versioned model record in the model registry */
export interface ModelRecord {
    readonly id: string;
    readonly version: string;
    readonly hash: string;
    readonly parentVersion: string | null;
    /** Other engine or model IDs this model depends on */
    readonly dependencies: string[];
    readonly signature: string;
    readonly lifecycleState: ModelLifecycleState;
    readonly registeredAt: Date;
    readonly kernelApiVersion: string;
}
/** Training performance snapshot */
export interface TrainingMetrics {
    accuracy: number;
    loss: number;
    rounds: number;
    participantCount: number;
    epochsCompleted: number;
    timestamp: Date;
}
/** Progress report from LocalTrainer */
export interface TrainingProgress {
    epoch: number;
    totalEpochs: number;
    loss: number;
    accuracy: number;
    elapsedMs: number;
    cancelled: boolean;
}
/** Represents one distributed learning round */
export interface LearningRound {
    readonly roundId: string;
    readonly roundNumber: number;
    status: RoundStatus;
    /** Node IDs that have joined this round */
    participants: string[];
    /** Node ID acting as round coordinator / leader */
    leaderId: string;
    readonly startedAt: Date;
    /** Hard deadline for the round (ms since epoch) */
    deadline: number;
    /** Number of retry attempts if the round fails */
    retryCount: number;
    strategyName: string;
    profileId?: string;
}
/** Result produced by AggregationManager after a round */
export interface AggregationResult {
    readonly roundId: string;
    readonly roundNumber: number;
    readonly algorithm: 'fedavg' | 'fedprox' | string;
    /** Node IDs that contributed valid updates */
    readonly contributors: string[];
    /** Hash of the aggregated output */
    readonly resultHash: string;
    /** Ordered list of audit events for this aggregation */
    readonly auditTrail: AuditRecord[];
    readonly completedAt: Date;
}
/** Immutable audit record for tamper-evident logging */
export interface AuditRecord {
    readonly eventId: string;
    readonly eventType: string;
    readonly roundId: string;
    readonly nodeId: string;
    readonly timestamp: Date;
    readonly detail: Record<string, any>;
}
/** A version record tracking any versioned entity */
export interface VersionRecord {
    readonly entityId: string;
    readonly entityType: 'model' | 'lora' | 'knowledge' | 'aggregation';
    readonly version: string;
    readonly parentVersion: string | null;
    readonly hash: string;
    readonly signature: string;
    readonly createdAt: Date;
}
/** Categories of data classified by the PrivacyManager */
export type DataCategory = 'lora_adapter' | 'model_update' | 'metadata' | 'knowledge_package' | 'dataset' | 'private_document' | 'conversation_history' | 'memory' | 'raw_user_file';
/**
 * Context object injected into every ILearningStrategy.
 * Provides access to DI services and engine sub-managers
 * without creating a direct dependency on the engine class.
 */
export interface IStrategyContext {
    /** Node ID of this AEGIS instance */
    readonly localNodeId: string;
    /** DI Engine reference (may be undefined in simulation mode) */
    readonly dis: any | null;
    /** Access to the AggregationManager */
    readonly aggregationManager: any;
    /** Access to the LoRAManager */
    readonly loraManager: any;
    /** Access to the PrivacyManager */
    readonly privacyManager: any;
    /** Access to the CheckpointManager */
    readonly checkpointManager: any;
    /** Access to the VersionManager */
    readonly versionManager: any;
}
/** Domain classifiers for a learning profile */
export type LearningDomain = 'medical' | 'code' | 'vision' | 'legal' | 'research' | 'enterprise' | 'general';
/** Defines what is being learned (profile) independent of how (strategy) */
export interface ILearningProfile {
    readonly profileId: string;
    readonly name: string;
    readonly baseModelId: string;
    readonly domain: LearningDomain;
    readonly loraConfig: LoRAConfig;
    /** Data category tags that must never leave the node */
    readonly dataConstraints: DataCategory[];
    /** Default strategy when none is explicitly selected */
    readonly defaultStrategy: string;
    readonly createdAt: Date;
    readonly metadata: Record<string, any>;
}
//# sourceMappingURL=index.d.ts.map