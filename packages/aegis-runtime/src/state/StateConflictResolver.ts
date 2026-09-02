import {
  IAegisStateRecord,
  IStateMutation,
  StateConflictStrategy,
  StateError,
  StateErrorCode
} from '@aegis/sdk';
import { StateVersionManager } from './StateVersionManager.js';

export class StateConflictResolver {
  static resolveConflict<T>(
    localRecord: IAegisStateRecord<T>,
    incomingMutation: IStateMutation<T>,
    strategy: StateConflictStrategy = StateConflictStrategy.REJECT
  ): { acceptIncoming: boolean; winnerValue?: T; winnerVersion?: number } {
    if (strategy === StateConflictStrategy.REJECT) {
      throw new StateError(
        StateErrorCode.STATE_CONFLICT,
        `State conflict detected for key "${localRecord.key}" between local version ${localRecord.versionInfo.version} (${localRecord.versionInfo.originNodeId}) and remote mutation ${incomingMutation.mutationId} (${incomingMutation.originNodeId}). Strategy REJECT in effect.`,
        { key: localRecord.key, localRecord, incomingMutation }
      );
    }

    if (strategy === StateConflictStrategy.LAST_WRITE_WINS) {
      const winner = StateVersionManager.evaluateLwwWinner(
        {
          version: localRecord.versionInfo.version,
          timestamp: localRecord.updatedAt,
          nodeId: localRecord.versionInfo.originNodeId,
          mutationId: localRecord.metadata?.lastMutationId as string || 'local',
          value: localRecord.value
        },
        {
          version: (localRecord.versionInfo.version || 1) + 1,
          timestamp: incomingMutation.timestamp,
          nodeId: incomingMutation.originNodeId,
          mutationId: incomingMutation.mutationId,
          value: incomingMutation.value as T
        }
      );

      const acceptIncoming = winner === 'B';
      return {
        acceptIncoming,
        winnerValue: acceptIncoming ? incomingMutation.value : localRecord.value,
        winnerVersion: acceptIncoming ? localRecord.versionInfo.version + 1 : localRecord.versionInfo.version
      };
    }

    // APPLICATION_DEFINED default fallback: reject
    throw new StateError(
      StateErrorCode.STATE_CONFLICT,
      `State conflict detected for key "${localRecord.key}". Application conflict handler required.`
    );
  }
}
