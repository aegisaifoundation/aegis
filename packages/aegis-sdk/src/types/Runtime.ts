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

export enum RuntimeMode {
  NORMAL = 'NORMAL',
  MAINTENANCE = 'MAINTENANCE',
  DIAGNOSTIC = 'DIAGNOSTIC',
  FEDERATION = 'FEDERATION',
  ISOLATED = 'ISOLATED'
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

export interface MemoryQuotas {
  maxSessions: number;
  maxHistorySize: number;
  maxWorkingMemorySize: number;
  maxSessionMemorySize: number;
  maxSnapshots: number;
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
