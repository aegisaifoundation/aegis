import { CoordinationError, CoordinationErrorCode } from '@aegis/sdk';
export var SchedulingStrategy;
(function (SchedulingStrategy) {
    SchedulingStrategy["LOCAL_PREFERRED"] = "LOCAL_PREFERRED";
    SchedulingStrategy["CAPABILITY_MATCHING"] = "CAPABILITY_MATCHING";
    SchedulingStrategy["LEAST_LOADED"] = "LEAST_LOADED";
    SchedulingStrategy["ROUND_ROBIN"] = "ROUND_ROBIN";
})(SchedulingStrategy || (SchedulingStrategy = {}));
export class TaskScheduler {
    localNodeId;
    capabilityRegistry;
    roundRobinIndex = 0;
    constructor(localNodeId, capabilityRegistry) {
        this.localNodeId = localNodeId;
        this.capabilityRegistry = capabilityRegistry;
    }
    selectNode(task, candidateNodeIds, policy = {
        strategy: SchedulingStrategy.LOCAL_PREFERRED,
        allowLocalExecution: true,
        allowRemoteExecution: true
    }) {
        // 1. Explicit targetNodeId requested
        if (task.targetNodeId) {
            if (this.isNodeEligible(task, task.targetNodeId)) {
                return task.targetNodeId;
            }
            throw new CoordinationError(CoordinationErrorCode.TASK_REQUIREMENTS_NOT_MET, `Requested target node "${task.targetNodeId}" does not meet requirements for task ${task.taskId}.`);
        }
        // 2. Local Preferred Strategy
        if (policy.strategy === SchedulingStrategy.LOCAL_PREFERRED &&
            policy.allowLocalExecution &&
            candidateNodeIds.includes(this.localNodeId) &&
            this.isNodeEligible(task, this.localNodeId)) {
            return this.localNodeId;
        }
        // 3. Filter eligible candidates
        const eligibleNodes = candidateNodeIds.filter(nodeId => {
            if (nodeId === this.localNodeId && !policy.allowLocalExecution)
                return false;
            if (nodeId !== this.localNodeId && !policy.allowRemoteExecution)
                return false;
            return this.isNodeEligible(task, nodeId);
        });
        if (eligibleNodes.length === 0) {
            throw new CoordinationError(CoordinationErrorCode.NO_ELIGIBLE_NODE, `No eligible node found meeting requirements for task "${task.taskId}".`);
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
    isNodeEligible(task, nodeId) {
        const caps = this.capabilityRegistry.getCapabilities(nodeId);
        if (!caps) {
            // If no explicit capabilities registered, assume default basic node eligibility
            return true;
        }
        const reqs = task.requirements;
        if (!reqs)
            return true;
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
    selectLeastLoadedNode(eligibleNodeIds) {
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
    sortTasksByPriority(tasks) {
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
