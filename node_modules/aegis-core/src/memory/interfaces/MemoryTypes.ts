export enum MemoryType {
  SESSION = 'SESSION',
  WORKING = 'WORKING'
}

export enum MemoryLifecycleState {
  ACTIVE = 'ACTIVE',
  STALE = 'STALE',
  ARCHIVED = 'ARCHIVED',
  EXPIRED = 'EXPIRED',
  CORRUPTED = 'CORRUPTED',
  LOCKED = 'LOCKED',
  REFINING = 'REFINING',
  DELETED = 'DELETED'
}

export enum SessionLifecycleState {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
  RESTORED = 'RESTORED',
  LOCKED = 'LOCKED',
  CORRUPTED = 'CORRUPTED',
  DELETED = 'DELETED'
}

export enum RuntimeLockState {
  IDLE = 'IDLE',
  SWITCHING = 'SWITCHING',
  RECOVERING = 'RECOVERING',
  SHUTTING_DOWN = 'SHUTTING_DOWN'
}

export enum BootMode {
  RESTORE_PREVIOUS = 'RESTORE_PREVIOUS',
  SAFE_MODE = 'SAFE_MODE',
  RECOVERY_MODE = 'RECOVERY_MODE',
  CLEAN_BOOT = 'CLEAN_BOOT'
}

export enum CheckoutStage {
  VALIDATING = 'VALIDATING',
  PERSISTING_CURRENT = 'PERSISTING_CURRENT',
  UNMOUNTING = 'UNMOUNTING',
  RESTORING_TARGET = 'RESTORING_TARGET',
  VALIDATING_TARGET = 'VALIDATING_TARGET',
  MOUNTING = 'MOUNTING',
  FINALIZING = 'FINALIZING',
  ROLLING_BACK = 'ROLLING_BACK'
}

export enum RuntimeHealthStatus {
  HEALTHY = 'HEALTHY',
  DEGRADED = 'DEGRADED',
  RECOVERING = 'RECOVERING',
  CORRUPTED = 'CORRUPTED',
  SAFE_MODE = 'SAFE_MODE'
}

export enum SessionRestoreMode {
  COLD_RESTORE = 'COLD_RESTORE',
  WARM_RESTORE = 'WARM_RESTORE',
  SAFE_RESTORE = 'SAFE_RESTORE'
}

export enum RuntimeMode {
  NORMAL = 'NORMAL',
  MAINTENANCE = 'MAINTENANCE',
  DIAGNOSTIC = 'DIAGNOSTIC',
  FEDERATION = 'FEDERATION',
  ISOLATED = 'ISOLATED'
}

export enum MountIntent {
  USER_RESTORE = 'USER_RESTORE',
  AUTONOMOUS_RESTORE = 'AUTONOMOUS_RESTORE',
  RECOVERY_RESTORE = 'RECOVERY_RESTORE',
  REPLAY_RESTORE = 'REPLAY_RESTORE',
  FEDERATION_RESTORE = 'FEDERATION_RESTORE'
}

export interface SourceAttribution {
  type: 'user' | 'agent' | 'workflow' | 'system' | 'plugin';
  id: string;
  origin?: string;
}

export interface ImportanceScoring {
  importanceScore: number; // 0.0 to 1.0
  stabilityScore: number;  // 0.0 to 1.0 (how resistant to change)
  freshnessScore: number;  // 0.0 to 1.0 (decay score)
  retrievalScore?: number; // score for vector retrieval
}

export interface MemoryEntity {
  id: string;
  type: string; // e.g. "patient", "doctor", "workflow", "project"
  name: string;
  properties: Record<string, any>;
  relationships: Array<{
    targetId: string;
    type: string; // e.g. "belongs_to", "assigned_to"
    weight?: number;
  }>;
  confidence: number; // 0.0 to 1.0
  timestamps: {
    createdAt: string;
    updatedAt: string;
  };
  source: SourceAttribution;
  tags: string[];
}

export interface MemoryQuotas {
  maxSessions: number;
  maxHistorySize: number; // in bytes
  maxWorkingMemorySize: number; // in words or characters
  maxSessionMemorySize: number; // in words or characters
  maxSnapshots: number;
}

export interface AuditLogEntry {
  timestamp: string;
  actor: string; // user, agent id, plugin id, workflow id
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
  };
  confidence: Record<string, number>;
  tags: string[];
  quotas: MemoryQuotas;
  
  // Display & Lineage Metadata
  displayName?: string;
  description?: string;
  createdFrom?: string;
  forkedFrom?: string;
  parentSessionId?: string;
  childSessions?: string[];
  sessionImportance?: number;
  
  // Expiration & Priority
  lastMountedAt?: string;
  pinned?: boolean;
  
  // Validation cache
  lastValidatedAt?: string;
  validationChecksum?: string;
  corruptionScore?: number;
  sessionEntropyScore?: number;
  semanticFingerprint?: string;
  sessionCognitiveLoad?: number;
  semanticDriftScore?: number;

  // Workflow place holders
  activeWorkflows?: string[];
  pendingTasks?: string[];
  
  // Lineage references
  forkReference?: {
    sourceSessionId: string;
    sourceHistoryRange: string;
  };

  // Soft-deleted tracking
  deletedAt?: string;
  deletedBy?: string;
  deletionReason?: string;

  // Quarantine tracking
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
}
