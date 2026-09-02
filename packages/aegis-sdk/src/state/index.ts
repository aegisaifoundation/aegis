export enum AegisStateScope {
  LOCAL = 'LOCAL',
  NODE = 'NODE',
  DISTRIBUTED = 'DISTRIBUTED'
}

export type StateOperation = 'CREATE' | 'UPDATE' | 'DELETE';

export enum StateSyncStatus {
  IDLE = 'IDLE',
  SYNCING = 'SYNCING',
  SYNCHRONIZED = 'SYNCHRONIZED',
  DEGRADED = 'DEGRADED',
  FAILED = 'FAILED'
}

export enum StateConflictStrategy {
  REJECT = 'REJECT',
  LAST_WRITE_WINS = 'LAST_WRITE_WINS',
  APPLICATION_DEFINED = 'APPLICATION_DEFINED'
}

export enum StateReplicationStrategy {
  NONE = 'NONE',
  SELECTED_NODES = 'SELECTED_NODES',
  BEST_EFFORT = 'BEST_EFFORT'
}

export enum StateWriteConsistency {
  LOCAL_ONLY = 'LOCAL_ONLY',
  BEST_EFFORT = 'BEST_EFFORT',
  REQUIRE_TARGET_ACK = 'REQUIRE_TARGET_ACK'
}

export interface IStateVersion {
  version: number;
  originNodeId: string;
}

export interface IStateReplicationPolicy {
  enabled: boolean;
  strategy: StateReplicationStrategy;
  targetNodeIds?: string[];
  replicationFactor?: number; // Total desired copies including originating node
  consistency?: StateWriteConsistency;
}

export interface IAegisStateRecord<T = unknown> {
  readonly key: string; // namespaced key e.g. aegis/task/123 or engine/di/foo
  readonly value: T;
  readonly versionInfo: IStateVersion;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly createdByNodeId: string;
  readonly updatedByNodeId: string;
  readonly scope: AegisStateScope;
  readonly deleted?: boolean;
  readonly deletedAt?: number;
  readonly replicationPolicy?: IStateReplicationPolicy;
  readonly metadata?: Record<string, unknown>;
}

export interface IStateTombstone {
  readonly key: string;
  readonly mutationId: string;
  readonly deletedAt: number;
  readonly deletedByNodeId: string;
  readonly version: number;
}

export interface IStateMutation<T = unknown> {
  readonly mutationId: string; // aegis-state-mutation://<uuid>
  readonly originNodeId: string;
  readonly timestamp: number;
  readonly key: string;
  readonly operation: StateOperation;
  readonly value?: T;
  readonly expectedVersion?: number;
  readonly scope: AegisStateScope;
  readonly metadata?: Record<string, unknown>;
}

export enum StateErrorCode {
  INVALID_STATE_KEY = 'INVALID_STATE_KEY',
  INVALID_STATE_RECORD = 'INVALID_STATE_RECORD',
  STATE_NOT_FOUND = 'STATE_NOT_FOUND',
  STATE_ALREADY_EXISTS = 'STATE_ALREADY_EXISTS',
  STATE_VERSION_CONFLICT = 'STATE_VERSION_CONFLICT',
  STATE_CONFLICT = 'STATE_CONFLICT',
  STATE_EXPIRED = 'STATE_EXPIRED',
  STATE_STORAGE_FAILURE = 'STATE_STORAGE_FAILURE',
  STATE_SERIALIZATION_FAILURE = 'STATE_SERIALIZATION_FAILURE',
  STATE_DESERIALIZATION_FAILURE = 'STATE_DESERIALIZATION_FAILURE',
  STATE_REPLICATION_FAILURE = 'STATE_REPLICATION_FAILURE',
  STATE_SYNC_FAILURE = 'STATE_SYNC_FAILURE',
  STATE_SCOPE_VIOLATION = 'STATE_SCOPE_VIOLATION',
  STATE_NOT_PERSISTENT = 'STATE_NOT_PERSISTENT',
  STATE_SIZE_EXCEEDED = 'STATE_SIZE_EXCEEDED',
  INVALID_REPLICATION_POLICY = 'INVALID_REPLICATION_POLICY'
}

export class StateError extends Error {
  constructor(
    public readonly code: StateErrorCode,
    message: string,
    public readonly details?: Record<string, any>
  ) {
    super(`[AEGIS State] ${code}: ${message}`);
    this.name = 'StateError';
  }
}
