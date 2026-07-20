import {
  RuntimeLockState,
  BootMode,
  CheckoutStage,
  RuntimeHealthStatus,
  RuntimeMode,
  MemoryLifecycleState,
  SessionLifecycleState,
  type MemoryQuotas,
  type SessionMetadata,
  type SessionState
} from '@aegis/sdk';

export {
  RuntimeLockState,
  BootMode,
  CheckoutStage,
  RuntimeHealthStatus,
  RuntimeMode,
  MemoryLifecycleState,
  SessionLifecycleState,
  type MemoryQuotas,
  type SessionMetadata,
  type SessionState
};

export enum MemoryType {
  SESSION = 'SESSION',
  WORKING = 'WORKING'
}

export enum SessionRestoreMode {
  COLD_RESTORE = 'COLD_RESTORE',
  WARM_RESTORE = 'WARM_RESTORE',
  SAFE_RESTORE = 'SAFE_RESTORE'
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
