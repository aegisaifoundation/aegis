import { IAegisDistributedTask } from '@aegis/sdk';
import { NodeCapabilityRegistry } from './NodeCapabilityRegistry.js';
export declare enum SchedulingStrategy {
    LOCAL_PREFERRED = "LOCAL_PREFERRED",
    CAPABILITY_MATCHING = "CAPABILITY_MATCHING",
    LEAST_LOADED = "LEAST_LOADED",
    ROUND_ROBIN = "ROUND_ROBIN"
}
export interface SchedulingPolicy {
    strategy: SchedulingStrategy;
    allowLocalExecution: boolean;
    allowRemoteExecution: boolean;
}
export declare class TaskScheduler {
    private readonly localNodeId;
    private readonly capabilityRegistry;
    private roundRobinIndex;
    constructor(localNodeId: string, capabilityRegistry: NodeCapabilityRegistry);
    selectNode(task: IAegisDistributedTask, candidateNodeIds: string[], policy?: SchedulingPolicy): string;
    isNodeEligible(task: IAegisDistributedTask, nodeId: string): boolean;
    private selectLeastLoadedNode;
    sortTasksByPriority(tasks: IAegisDistributedTask[]): IAegisDistributedTask[];
}
