import {
  IAegisDistributedTask,
  ITaskRequirements,
  INodeCapabilities,
  INodeLoad,
  TaskPriority,
  CoordinationError,
  CoordinationErrorCode
} from '@aegis/sdk';
import { NodeCapabilityRegistry } from './NodeCapabilityRegistry.js';

export enum SchedulingStrategy {
  LOCAL_PREFERRED = 'LOCAL_PREFERRED',
  CAPABILITY_MATCHING = 'CAPABILITY_MATCHING',
  LEAST_LOADED = 'LEAST_LOADED',
  ROUND_ROBIN = 'ROUND_ROBIN'
}

export interface SchedulingPolicy {
  strategy: SchedulingStrategy;
  allowLocalExecution: boolean;
  allowRemoteExecution: boolean;
}

export class TaskScheduler {
  private roundRobinIndex = 0;

  constructor(
    private readonly localNodeId: string,
    private readonly capabilityRegistry: NodeCapabilityRegistry
  ) {}

  selectNode(
    task: IAegisDistributedTask,
    candidateNodeIds: string[],
    policy: SchedulingPolicy = {
      strategy: SchedulingStrategy.LOCAL_PREFERRED,
      allowLocalExecution: true,
      allowRemoteExecution: true
    }
  ): string {
    // 1. Explicit targetNodeId requested
    if (task.targetNodeId) {
      if (this.isNodeEligible(task, task.targetNodeId)) {
        return task.targetNodeId;
      }
      throw new CoordinationError(
        CoordinationErrorCode.TASK_REQUIREMENTS_NOT_MET,
        `Requested target node "${task.targetNodeId}" does not meet requirements for task ${task.taskId}.`
      );
    }

    // 2. Local Preferred Strategy
    if (
      policy.strategy === SchedulingStrategy.LOCAL_PREFERRED &&
      policy.allowLocalExecution &&
      candidateNodeIds.includes(this.localNodeId) &&
      this.isNodeEligible(task, this.localNodeId)
    ) {
      return this.localNodeId;
    }

    // 3. Filter eligible candidates
    const eligibleNodes = candidateNodeIds.filter(nodeId => {
      if (nodeId === this.localNodeId && !policy.allowLocalExecution) return false;
      if (nodeId !== this.localNodeId && !policy.allowRemoteExecution) return false;
      return this.isNodeEligible(task, nodeId);
    });

    if (eligibleNodes.length === 0) {
      throw new CoordinationError(
        CoordinationErrorCode.NO_ELIGIBLE_NODE,
        `No eligible node found meeting requirements for task "${task.taskId}".`
      );
    }

    // 4. Select strategy
    if (policy.strategy === SchedulingStrategy.LEAST_LOADED) {
      return this.selectLeastLoadedNode(eligibleNodes);
    }

    if (policy.strategy === SchedulingStrategy.ROUND_ROBIN) {
      const selected = eligibleNodes[this.roundRobinIndex % eligibleNodes.length];
      this.roundRobinIndex++;
      return selected;
    }

    // Default: Capability matching / First eligible
    return eligibleNodes[0];
  }

  isNodeEligible(task: IAegisDistributedTask, nodeId: string): boolean {
    const caps = this.capabilityRegistry.getCapabilities(nodeId);
    if (!caps) {
      // If no explicit capabilities registered, assume default basic node eligibility
      return true;
    }

    const reqs = task.requirements;
    if (!reqs) return true;

    // Check logical capabilities
    if (reqs.requiredCapabilities && reqs.requiredCapabilities.length > 0) {
      for (const reqCap of reqs.requiredCapabilities) {
        if (!caps.capabilities.includes(reqCap)) {
          return false;
        }
      }
    }

    // Check hardware resources if specified
    if (caps.resources) {
      if (reqs.minimumCpuCores && (caps.resources.cpuCores || 0) < reqs.minimumCpuCores) {
        return false;
      }
      if (reqs.minimumMemoryMB && (caps.resources.memoryMB || 0) < reqs.minimumMemoryMB) {
        return false;
      }
      if (reqs.requiresGpu && !caps.resources.gpuAvailable) {
        return false;
      }
      if (reqs.minimumGpuMemoryMB && (caps.resources.gpuMemoryMB || 0) < reqs.minimumGpuMemoryMB) {
        return false;
      }
    }

    return true;
  }

  private selectLeastLoadedNode(eligibleNodeIds: string[]): string {
    let bestNodeId = eligibleNodeIds[0];
    let lowestLoad = Number.MAX_SAFE_INTEGER;

    for (const nodeId of eligibleNodeIds) {
      const loadInfo = this.capabilityRegistry.getNodeLoad(nodeId);
      const activeCount = loadInfo?.activeTasks || 0;

      if (activeCount < lowestLoad) {
        lowestLoad = activeCount;
        bestNodeId = nodeId;
      }
    }

    return bestNodeId;
  }

  sortTasksByPriority(tasks: IAegisDistributedTask[]): IAegisDistributedTask[] {
    return [...tasks].sort((a, b) => {
      // Priority CRITICAL (0) < HIGH (1) < NORMAL (2) < LOW (3)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Starvation / Age ordering: older tasks first
      return a.createdAt - b.createdAt;
    });
  }
}
