export declare enum MemoryType {
    SESSION = "SESSION",
    WORKING = "WORKING"
}
export declare enum MemoryLifecycleState {
    ACTIVE = "ACTIVE",
    STALE = "STALE",
    ARCHIVED = "ARCHIVED",
    EXPIRED = "EXPIRED",
    CORRUPTED = "CORRUPTED",
    LOCKED = "LOCKED",
    REFINING = "REFINING",
    DELETED = "DELETED"
}
export declare enum SessionLifecycleState {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    ARCHIVED = "ARCHIVED",
    RESTORED = "RESTORED",
    LOCKED = "LOCKED",
    CORRUPTED = "CORRUPTED",
    DELETED = "DELETED"
}
export declare enum RuntimeLockState {
    IDLE = "IDLE",
    SWITCHING = "SWITCHING",
    RECOVERING = "RECOVERING",
    SHUTTING_DOWN = "SHUTTING_DOWN"
}
export declare enum BootMode {
    RESTORE_PREVIOUS = "RESTORE_PREVIOUS",
    SAFE_MODE = "SAFE_MODE",
    RECOVERY_MODE = "RECOVERY_MODE",
    CLEAN_BOOT = "CLEAN_BOOT"
}
export declare enum CheckoutStage {
    VALIDATING = "VALIDATING",
    PERSISTING_CURRENT = "PERSISTING_CURRENT",
    UNMOUNTING = "UNMOUNTING",
    RESTORING_TARGET = "RESTORING_TARGET",
    VALIDATING_TARGET = "VALIDATING_TARGET",
    MOUNTING = "MOUNTING",
    FINALIZING = "FINALIZING",
    ROLLING_BACK = "ROLLING_BACK"
}
export declare enum RuntimeHealthStatus {
    HEALTHY = "HEALTHY",
    DEGRADED = "DEGRADED",
    RECOVERING = "RECOVERING",
    CORRUPTED = "CORRUPTED",
    SAFE_MODE = "SAFE_MODE"
}
export declare enum SessionRestoreMode {
    COLD_RESTORE = "COLD_RESTORE",
    WARM_RESTORE = "WARM_RESTORE",
    SAFE_RESTORE = "SAFE_RESTORE"
}
export declare enum RuntimeMode {
    NORMAL = "NORMAL",
    MAINTENANCE = "MAINTENANCE",
    DIAGNOSTIC = "DIAGNOSTIC",
    FEDERATION = "FEDERATION",
    ISOLATED = "ISOLATED"
}
export declare enum MountIntent {
    USER_RESTORE = "USER_RESTORE",
    AUTONOMOUS_RESTORE = "AUTONOMOUS_RESTORE",
    RECOVERY_RESTORE = "RECOVERY_RESTORE",
    REPLAY_RESTORE = "REPLAY_RESTORE",
    FEDERATION_RESTORE = "FEDERATION_RESTORE"
}
export interface SourceAttribution {
    type: 'user' | 'agent' | 'workflow' | 'system' | 'plugin';
    id: string;
    origin?: string;
}
export interface ImportanceScoring {
    importanceScore: number;
    stabilityScore: number;
    freshnessScore: number;
    retrievalScore?: number;
}
export interface MemoryEntity {
    id: string;
    type: string;
    name: string;
    properties: Record<string, any>;
    relationships: Array<{
        targetId: string;
        type: string;
        weight?: number;
    }>;
    confidence: number;
    timestamps: {
        createdAt: string;
        updatedAt: string;
    };
    source: SourceAttribution;
    tags: string[];
}
export interface MemoryQuotas {
    maxSessions: number;
    maxHistorySize: number;
    maxWorkingMemorySize: number;
    maxSessionMemorySize: number;
    maxSnapshots: number;
}
export interface AuditLogEntry {
    timestamp: string;
    actor: string;
    action: 'read' | 'write' | 'delete' | 'refine' | 'snapshot' | 'restore';
    targetType: string;
    targetId: string;
    details?: Record<string, any>;
}
export interface CompressionStats {
    originalWords: number;
    compressedWords: number;
    ratio: number;
    lastCompressedAt: string;
}
export interface SessionMetadata {
    sessionId: string;
    createdAt: string;
    updatedAt: string;
    lastAccessedAt: string;
    memoryVersion: string;
    lifecycleState: MemoryLifecycleState | SessionLifecycleState;
    checksums: {
        history?: string;
        sessionMemory?: string;
        workingMemory?: string;
        task?: string;
    };
    confidence: Record<string, number>;
    tags: string[];
    quotas: MemoryQuotas;
    displayName?: string;
    description?: string;
    createdFrom?: string;
    forkedFrom?: string;
    parentSessionId?: string;
    childSessions?: string[];
    sessionImportance?: number;
    lastMountedAt?: string;
    pinned?: boolean;
    lastValidatedAt?: string;
    validationChecksum?: string;
    corruptionScore?: number;
    sessionEntropyScore?: number;
    semanticFingerprint?: string;
    sessionCognitiveLoad?: number;
    semanticDriftScore?: number;
    activeWorkflows?: string[];
    pendingTasks?: string[];
    forkReference?: {
        sourceSessionId: string;
        sourceHistoryRange: string;
    };
    deletedAt?: string;
    deletedBy?: string;
    deletionReason?: string;
    quarantineReason?: string;
    quarantinedAt?: string;
}
export interface SessionState {
    sessionId: string;
    status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'DELETED';
    currentObjective: string;
    activeTasks: string[];
    lastUpdatedAt: string;
    checkpointVersion: number;
    temporaryExecutionContext?: Record<string, any>;
    preferences?: Record<string, any>;
    stableFacts?: string[];
    implementationPlan?: string;
    implementedDetails?: string;
    goal?: string;
    tasks?: string[];
}
