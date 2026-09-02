import {
  IStateReplicationPolicy,
  StateReplicationStrategy,
  StateWriteConsistency
} from '@aegis/sdk';

export class StateReplicationManager {
  constructor(private readonly localNodeId: string) {}

  selectReplicationTargets(
    policy: IStateReplicationPolicy | undefined,
    availablePeerNodeIds: string[]
  ): string[] {
    if (!policy || !policy.enabled || policy.strategy === StateReplicationStrategy.NONE) {
      return [];
    }

    if (policy.strategy === StateReplicationStrategy.SELECTED_NODES && policy.targetNodeIds) {
      return policy.targetNodeIds.filter(id => id !== this.localNodeId && availablePeerNodeIds.includes(id));
    }

    if (policy.strategy === StateReplicationStrategy.BEST_EFFORT) {
      const eligiblePeers = availablePeerNodeIds.filter(id => id !== this.localNodeId);
      // replicationFactor = total desired copies including local node
      const desiredRemoteCount = Math.max(1, (policy.replicationFactor ?? 2) - 1);
      return eligiblePeers.slice(0, desiredRemoteCount);
    }

    return [];
  }
}
