export enum TaskState {
  CREATED = 'CREATED',
  QUEUED = 'QUEUED',
  SCHEDULING = 'SCHEDULING',
  ASSIGNED = 'ASSIGNED',
  ACCEPTED = 'ACCEPTED',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

export enum TaskPriority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3
}

export interface ITaskRequirements {
  requiredCapabilities?: string[];
  minimumCpuCores?: number;
  minimumMemoryMB?: number;
  requiresGpu?: boolean;
  minimumGpuMemoryMB?: number;
}

export interface INodeCapabilities {
  readonly nodeId: string; // aegis://<uuid>
  capabilities: string[];
  resources?: {
    cpuCores?: number;
    memoryMB?: number;
    gpuAvailable?: boolean;
    gpuMemoryMB?: number;
  };
  metadata?: Record<string, unknown>;
  updatedAt: number;
}

export interface INodeLoad {
  readonly nodeId: string; // aegis://<uuid>
  activeTasks: number;
  queuedTasks: number;
  cpuLoad?: number;
  memoryUsage?: number;
  timestamp: number;
}

export interface IAegisDistributedTask<TPayload = unknown> {
  readonly taskId: string; // aegis-task://<uuid>
  readonly creatorNodeId: string; // aegis://<uuid>
  readonly createdAt: number;
  type: string;
  payload: TPayload;
  state: TaskState;
  priority: TaskPriority;
  requirements?: ITaskRequirements;
  targetNodeId?: string; // aegis://<uuid>
  assignedNodeId?: string; // aegis://<uuid>
  executionAttempt: number;
  deadline?: number;
  metadata?: Record<string, unknown>;
}

export interface IAegisTaskResult<TResult = unknown> {
  readonly taskId: string; // aegis-task://<uuid>
  readonly executionAttempt: number;
  readonly workerNodeId: string; // aegis://<uuid>
  readonly status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
  result?: TResult;
  error?: {
    code: string;
    message: string;
  };
  completedAt: number;
}

export interface ITaskLease {
  readonly taskId: string; // aegis-task://<uuid>
  readonly executionAttempt: number;
  readonly workerNodeId: string; // aegis://<uuid>
  readonly leaseId: string;
  leaseExpiresAt: number;
}

export enum CoordinationErrorCode {
  INVALID_TASK = 'INVALID_TASK',
  INVALID_TASK_STATE = 'INVALID_TASK_STATE',
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  TASK_EXPIRED = 'TASK_EXPIRED',
  TASK_NOT_SUPPORTED = 'TASK_NOT_SUPPORTED',
  TASK_REQUIREMENTS_NOT_MET = 'TASK_REQUIREMENTS_NOT_MET',
  NO_ELIGIBLE_NODE = 'NO_ELIGIBLE_NODE',
  TASK_ASSIGNMENT_TIMEOUT = 'TASK_ASSIGNMENT_TIMEOUT',
  TASK_REJECTED = 'TASK_REJECTED',
  TASK_EXECUTION_FAILED = 'TASK_EXECUTION_FAILED',
  TASK_EXECUTION_TIMEOUT = 'TASK_EXECUTION_TIMEOUT',
  TASK_LEASE_EXPIRED = 'TASK_LEASE_EXPIRED',
  TASK_CANCELLED = 'TASK_CANCELLED',
  TASK_CAPACITY_EXCEEDED = 'TASK_CAPACITY_EXCEEDED',
  TASK_DUPLICATE_EXECUTION = 'TASK_DUPLICATE_EXECUTION'
}

export class CoordinationError extends Error {
  constructor(
    public readonly code: CoordinationErrorCode,
    message: string,
    public readonly details?: Record<string, any>
  ) {
    super(`[AEGIS Coordination] ${code}: ${message}`);
    this.name = 'CoordinationError';
  }
}
