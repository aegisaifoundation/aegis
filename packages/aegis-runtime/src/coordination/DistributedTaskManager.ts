import { randomUUID } from 'crypto';
import {
  IAegisDistributedTask,
  IAegisTaskResult,
  ITaskRequirements,
  TaskPriority,
  TaskState,
  CoordinationError,
  CoordinationErrorCode
} from '@aegis/sdk';
import { TaskStateValidator } from './TaskStateValidator.js';
import { NodeCapabilityRegistry } from './NodeCapabilityRegistry.js';
import { TaskScheduler, SchedulingPolicy, SchedulingStrategy } from './TaskScheduler.js';
import { TaskWorkerRuntime } from './TaskWorkerRuntime.js';
import { TaskRecoveryManager } from './TaskRecoveryManager.js';
import { AegisMessageRouter } from '../communication/AegisMessageRouter.js';
import { AegisStateManager } from '../state/AegisStateManager.js';
import { PeerRegistry } from '../networking/PeerRegistry.js';
import { AegisStateScope } from '@aegis/sdk';

export interface CreateTaskOptions<T = any> {
  type: string;
  payload: T;
  priority?: TaskPriority;
  requirements?: ITaskRequirements;
  targetNodeId?: string;
  deadline?: number;
  metadata?: Record<string, unknown>;
}

export class DistributedTaskManager {
  private tasks = new Map<string, IAegisDistributedTask>();
  private capabilityRegistry: NodeCapabilityRegistry;
  private scheduler: TaskScheduler;
  private workerRuntime: TaskWorkerRuntime;
  private recoveryManager = new TaskRecoveryManager();
  private progressListeners = new Map<string, Set<(fraction: number, msg?: string) => void>>();
  private completionListeners = new Map<string, Set<(result: IAegisTaskResult) => void>>();

  constructor(
    private readonly localNodeId: string,
    private readonly messageRouter: AegisMessageRouter,
    private readonly peerRegistry: PeerRegistry,
    options?: { maxConcurrentTasks?: number; maxQueuedTasks?: number },
    private readonly stateManager?: AegisStateManager
  ) {
    this.capabilityRegistry = new NodeCapabilityRegistry(localNodeId);
    this.scheduler = new TaskScheduler(localNodeId, this.capabilityRegistry);
    this.workerRuntime = new TaskWorkerRuntime(
      localNodeId,
      options?.maxConcurrentTasks ?? 5,
      options?.maxQueuedTasks ?? 20
    );

    this.registerCoordinationMessageHandlers();
  }

  getCapabilityRegistry(): NodeCapabilityRegistry {
    return this.capabilityRegistry;
  }

  getScheduler(): TaskScheduler {
    return this.scheduler;
  }

  getWorkerRuntime(): TaskWorkerRuntime {
    return this.workerRuntime;
  }

  getRecoveryManager(): TaskRecoveryManager {
    return this.recoveryManager;
  }

  createTask<T = any>(options: CreateTaskOptions<T>): IAegisDistributedTask<T> {
    const taskId = `aegis-task://${randomUUID()}`;
    const task: IAegisDistributedTask<T> = {
      taskId,
      creatorNodeId: this.localNodeId,
      createdAt: Date.now(),
      type: options.type,
      payload: options.payload,
      state: TaskState.CREATED,
      priority: options.priority ?? TaskPriority.NORMAL,
      requirements: options.requirements,
      targetNodeId: options.targetNodeId,
      executionAttempt: 1,
      deadline: options.deadline,
      metadata: options.metadata
    };

    this.tasks.set(taskId, task);
    this.persistTaskState(task).catch(() => {});
    return task;
  }

  getTask(taskId: string): IAegisDistributedTask | undefined {
    return this.tasks.get(taskId);
  }

  updateTaskState(taskId: string, newState: TaskState): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new CoordinationError(
        CoordinationErrorCode.TASK_NOT_FOUND,
        `Task "${taskId}" not found.`
      );
    }

    TaskStateValidator.validateTransition(taskId, task.state, newState);
    task.state = newState;
    this.persistTaskState(task).catch(() => {});
  }

  async persistTaskState(task: IAegisDistributedTask): Promise<void> {
    if (!this.stateManager) return;
    const key = `aegis/task/${task.taskId}`;
    // Persist only durable task metadata, excluding transient runtime objects
    const persistedState = {
      taskId: task.taskId,
      creatorNodeId: task.creatorNodeId,
      state: task.state,
      assignedNodeId: task.assignedNodeId,
      executionAttempt: task.executionAttempt,
      deadline: task.deadline,
      type: task.type,
      updatedAt: Date.now()
    };

    const existing = await this.stateManager.getState(key);
    if (!existing) {
      await this.stateManager.createState(key, persistedState, { scope: AegisStateScope.NODE });
    } else {
      await this.stateManager.updateState(key, persistedState, { scope: AegisStateScope.NODE });
    }
  }

  async restorePersistedTasks(): Promise<number> {
    if (!this.stateManager) return 0;
    const records = await this.stateManager.listState('aegis/task/');
    let restoredCount = 0;

    for (const rec of records) {
      const pData = rec.value as any;
      if (pData && pData.taskId) {
        if (!this.tasks.has(pData.taskId)) {
          const restoredTask: IAegisDistributedTask = {
            taskId: pData.taskId,
            creatorNodeId: pData.creatorNodeId || this.localNodeId,
            createdAt: rec.createdAt,
            type: pData.type || 'restored-task',
            payload: {},
            state: pData.state || TaskState.CREATED,
            priority: TaskPriority.NORMAL,
            assignedNodeId: pData.assignedNodeId,
            executionAttempt: pData.executionAttempt || 1,
            deadline: pData.deadline
          };
          this.tasks.set(pData.taskId, restoredTask);
          restoredCount++;
        }
      }
    }

    console.log(`[DistributedTaskManager] Restored ${restoredCount} durable task record(s) from persistent state.`);
    return restoredCount;
  }

  async submitTask<TRes = any>(
    task: IAegisDistributedTask,
    policy?: Partial<SchedulingPolicy>
  ): Promise<IAegisTaskResult<TRes>> {
    // 1. Deadline Check
    if (task.deadline && Date.now() > task.deadline) {
      this.updateTaskState(task.taskId, TaskState.EXPIRED);
      throw new CoordinationError(
        CoordinationErrorCode.TASK_EXPIRED,
        `Task "${task.taskId}" has expired past deadline.`
      );
    }

    this.updateTaskState(task.taskId, TaskState.QUEUED);
    this.updateTaskState(task.taskId, TaskState.SCHEDULING);

    // 2. Discover active candidate peers
    const activePeers = this.peerRegistry.listPeers().map((p: any) => p.nodeId);
    const candidateNodes = Array.from(new Set([this.localNodeId, ...activePeers]));

    const schedPolicy: SchedulingPolicy = {
      strategy: policy?.strategy ?? SchedulingStrategy.LOCAL_PREFERRED,
      allowLocalExecution: policy?.allowLocalExecution ?? true,
      allowRemoteExecution: policy?.allowRemoteExecution ?? true
    };

    let selectedNodeId: string;
    try {
      selectedNodeId = this.scheduler.selectNode(task, candidateNodes, schedPolicy);
    } catch (err: any) {
      this.updateTaskState(task.taskId, TaskState.FAILED);
      throw err;
    }

    task.assignedNodeId = selectedNodeId;
    this.updateTaskState(task.taskId, TaskState.ASSIGNED);

    // 3. Local Execution Path
    if (selectedNodeId === this.localNodeId) {
      this.updateTaskState(task.taskId, TaskState.ACCEPTED);
      this.updateTaskState(task.taskId, TaskState.RUNNING);

      try {
        const result = await this.workerRuntime.executeTask<TRes>(task, (fraction, msg) => {
          this.notifyProgress(task.taskId, fraction, msg);
        });

        this.updateTaskState(task.taskId, TaskState.COMPLETED);
        this.notifyCompletion(task.taskId, result);
        return result;
      } catch (err: any) {
        this.updateTaskState(task.taskId, TaskState.FAILED);
        throw err;
      }
    }

    // 4. Remote Execution Path over Phase 3 Messaging
    return this.executeRemoteTask<TRes>(task, selectedNodeId);
  }

  private async executeRemoteTask<TRes = any>(
    task: IAegisDistributedTask,
    targetNodeId: string
  ): Promise<IAegisTaskResult<TRes>> {
    return new Promise<IAegisTaskResult<TRes>>(async (resolve, reject) => {
      // Setup completion listener
      const onComplete = (result: IAegisTaskResult) => {
        if (result.status === 'COMPLETED') {
          this.updateTaskState(task.taskId, TaskState.COMPLETED);
          resolve(result as IAegisTaskResult<TRes>);
        } else {
          this.updateTaskState(task.taskId, TaskState.FAILED);
          reject(
            new CoordinationError(
              (result.error?.code as any) || CoordinationErrorCode.TASK_EXECUTION_FAILED,
              result.error?.message || 'Remote task execution failed.'
            )
          );
        }
      };

      this.onTaskCompleted(task.taskId, onComplete);

      try {
        // Send TASK.ASSIGN request to remote worker expecting explicit TASK.ACCEPT / TASK.REJECT response
        const response = await this.messageRouter.request<{ status: 'ACCEPTED' | 'REJECTED'; reason?: string }>(
          targetNodeId,
          'TASK.ASSIGN',
          task,
          { targetEngine: 'distributed-coordination', timeoutMs: 5000 }
        );

        if (response.status === 'ACCEPTED') {
          this.updateTaskState(task.taskId, TaskState.ACCEPTED);
          this.updateTaskState(task.taskId, TaskState.RUNNING);
          this.recoveryManager.grantLease(task.taskId, task.executionAttempt, targetNodeId, 15000);
        } else {
          this.updateTaskState(task.taskId, TaskState.FAILED);
          reject(
            new CoordinationError(
              CoordinationErrorCode.TASK_REJECTED,
              `Worker node "${targetNodeId}" rejected task: ${response.reason}`
            )
          );
        }
      } catch (err: any) {
        this.updateTaskState(task.taskId, TaskState.FAILED);
        reject(err);
      }
    });
  }

  async cancelTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.state === TaskState.COMPLETED || task.state === TaskState.CANCELLED) {
      return true;
    }

    this.updateTaskState(taskId, TaskState.CANCELLED);

    if (task.assignedNodeId === this.localNodeId) {
      this.workerRuntime.cancelTask(taskId);
    } else if (task.assignedNodeId) {
      const cancelEnv = this.messageRouter.getFactory().createMessage({
        messageType: 'TASK.CANCEL',
        payload: { taskId },
        targetNodeId: task.assignedNodeId,
        targetEngine: 'distributed-coordination'
      });
      await this.messageRouter.send(cancelEnv);
    }

    return true;
  }

  onTaskProgress(taskId: string, callback: (fraction: number, msg?: string) => void): void {
    if (!this.progressListeners.has(taskId)) {
      this.progressListeners.set(taskId, new Set());
    }
    this.progressListeners.get(taskId)!.add(callback);
  }

  onTaskCompleted(taskId: string, callback: (result: IAegisTaskResult) => void): void {
    if (!this.completionListeners.has(taskId)) {
      this.completionListeners.set(taskId, new Set());
    }
    this.completionListeners.get(taskId)!.add(callback);
  }

  private notifyProgress(taskId: string, fraction: number, msg?: string): void {
    const listeners = this.progressListeners.get(taskId);
    if (listeners) {
      for (const cb of listeners) {
        cb(fraction, msg);
      }
    }
  }

  private notifyCompletion(taskId: string, result: IAegisTaskResult): void {
    const listeners = this.completionListeners.get(taskId);
    if (listeners) {
      for (const cb of listeners) {
        cb(result);
      }
    }
  }

  private registerCoordinationMessageHandlers(): void {
    this.messageRouter.getLocalBus().registerEngine('distributed-coordination', async (envelope) => {
      const type = envelope.messageType;

      // 1. Ingress TASK.ASSIGN (Worker receives task assignment from coordinator)
      if (type === 'TASK.ASSIGN') {
        const task = envelope.payload as IAegisDistributedTask;
        const acceptance = this.workerRuntime.canAcceptTask(task);

        if (!acceptance.canAccept) {
          const rejectResp = this.messageRouter.getFactory().createResponse(envelope, {
            status: 'REJECTED',
            reason: acceptance.reason
          });
          await this.messageRouter.send(rejectResp);
          return;
        }

        // Accept task explicitly
        const acceptResp = this.messageRouter.getFactory().createResponse(envelope, {
          status: 'ACCEPTED'
        });
        await this.messageRouter.send(acceptResp);

        // Execute task asynchronously in worker runtime
        Promise.resolve().then(async () => {
          const result = await this.workerRuntime.executeTask(task, (fraction, msg) => {
            const progMsg = this.messageRouter.getFactory().createMessage({
              messageType: 'TASK.PROGRESS',
              payload: { taskId: task.taskId, fraction, msg },
              targetNodeId: envelope.senderNodeId,
              targetEngine: 'distributed-coordination'
            });
            this.messageRouter.send(progMsg).catch(() => {});
          });

          const resultMsg = this.messageRouter.getFactory().createMessage({
            messageType: 'TASK.RESULT',
            payload: result,
            targetNodeId: envelope.senderNodeId,
            targetEngine: 'distributed-coordination'
          });
          await this.messageRouter.send(resultMsg);
        });
        return;
      }

      // 2. Ingress TASK.PROGRESS (Coordinator receives progress update from worker)
      if (type === 'TASK.PROGRESS') {
        const { taskId, fraction, msg } = envelope.payload as any;
        this.recoveryManager.renewLease(taskId, 15000);
        this.notifyProgress(taskId, fraction, msg);
        return;
      }

      // 3. Ingress TASK.RESULT (Coordinator receives final result from worker)
      if (type === 'TASK.RESULT') {
        const result = envelope.payload as IAegisTaskResult;
        this.recoveryManager.revokeLease(result.taskId);
        this.notifyCompletion(result.taskId, result);
        return;
      }

      // 4. Ingress TASK.CANCEL (Worker receives cancellation request)
      if (type === 'TASK.CANCEL') {
        const { taskId } = envelope.payload as any;
        this.workerRuntime.cancelTask(taskId);
        return;
      }
    });
  }
}
