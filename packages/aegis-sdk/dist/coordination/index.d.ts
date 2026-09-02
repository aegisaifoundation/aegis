export declare enum TaskState {
    CREATED = "CREATED",
    QUEUED = "QUEUED",
    SCHEDULING = "SCHEDULING",
    ASSIGNED = "ASSIGNED",
    ACCEPTED = "ACCEPTED",
    RUNNING = "RUNNING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED",
    EXPIRED = "EXPIRED"
}
export declare enum TaskPriority {
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
    readonly nodeId: string;
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
    readonly nodeId: string;
    activeTasks: number;
    queuedTasks: number;
    cpuLoad?: number;
    memoryUsage?: number;
    timestamp: number;
}
export interface IAegisDistributedTask<TPayload = unknown> {
    readonly taskId: string;
    readonly creatorNodeId: string;
    readonly createdAt: number;
    type: string;
    payload: TPayload;
    state: TaskState;
    priority: TaskPriority;
    requirements?: ITaskRequirements;
    targetNodeId?: string;
    assignedNodeId?: string;
    executionAttempt: number;
    deadline?: number;
    metadata?: Record<string, unknown>;
}
export interface IAegisTaskResult<TResult = unknown> {
    readonly taskId: string;
    readonly executionAttempt: number;
    readonly workerNodeId: string;
    readonly status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
    result?: TResult;
    error?: {
        code: string;
        message: string;
    };
    completedAt: number;
}
export interface ITaskLease {
    readonly taskId: string;
    readonly executionAttempt: number;
    readonly workerNodeId: string;
    readonly leaseId: string;
    leaseExpiresAt: number;
}
export declare enum CoordinationErrorCode {
    INVALID_TASK = "INVALID_TASK",
    INVALID_TASK_STATE = "INVALID_TASK_STATE",
    TASK_NOT_FOUND = "TASK_NOT_FOUND",
    TASK_EXPIRED = "TASK_EXPIRED",
    TASK_NOT_SUPPORTED = "TASK_NOT_SUPPORTED",
    TASK_REQUIREMENTS_NOT_MET = "TASK_REQUIREMENTS_NOT_MET",
    NO_ELIGIBLE_NODE = "NO_ELIGIBLE_NODE",
    TASK_ASSIGNMENT_TIMEOUT = "TASK_ASSIGNMENT_TIMEOUT",
    TASK_REJECTED = "TASK_REJECTED",
    TASK_EXECUTION_FAILED = "TASK_EXECUTION_FAILED",
    TASK_EXECUTION_TIMEOUT = "TASK_EXECUTION_TIMEOUT",
    TASK_LEASE_EXPIRED = "TASK_LEASE_EXPIRED",
    TASK_CANCELLED = "TASK_CANCELLED",
    TASK_CAPACITY_EXCEEDED = "TASK_CAPACITY_EXCEEDED",
    TASK_DUPLICATE_EXECUTION = "TASK_DUPLICATE_EXECUTION"
}
export declare class CoordinationError extends Error {
    readonly code: CoordinationErrorCode;
    readonly details?: Record<string, any> | undefined;
    constructor(code: CoordinationErrorCode, message: string, details?: Record<string, any> | undefined);
}
