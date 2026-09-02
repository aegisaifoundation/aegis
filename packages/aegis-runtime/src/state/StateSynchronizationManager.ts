import {
  IAegisStateRecord,
  IStateMutation,
  StateSyncStatus,
  StateWriteConsistency
} from '@aegis/sdk';
import { AegisMessageRouter } from '../communication/AegisMessageRouter.js';
import { StateMutationDeduplicationRegistry } from './StateMutationDeduplicationRegistry.js';
import { AegisStateStore } from './AegisStateStore.js';
import { StateVersionManager } from './StateVersionManager.js';
import { StateConflictResolver } from './StateConflictResolver.js';

export class StateSynchronizationManager {
  private peerSyncStatus = new Map<string, StateSyncStatus>();
  private deduplicationRegistry = new StateMutationDeduplicationRegistry();

  constructor(
    private readonly localNodeId: string,
    private readonly messageRouter: AegisMessageRouter,
    private readonly stateStore: AegisStateStore
  ) {
    this.registerStateMessageHandlers();
  }

  getPeerSyncStatus(peerNodeId: string): StateSyncStatus {
    return this.peerSyncStatus.get(peerNodeId) || StateSyncStatus.IDLE;
  }

  setPeerSyncStatus(peerNodeId: string, status: StateSyncStatus): void {
    this.peerSyncStatus.set(peerNodeId, status);
  }

  async broadcastMutation(mutation: IStateMutation, targetNodeIds?: string[]): Promise<void> {
    if (targetNodeIds && targetNodeIds.length > 0) {
      for (const targetId of targetNodeIds) {
        const msg = this.messageRouter.getFactory().createMessage({
          messageType: 'STATE.MUTATION',
          payload: mutation,
          targetNodeId: targetId,
          targetEngine: 'aegis-state-sync'
        });
        await this.messageRouter.send(msg);
      }
    } else {
      const msg = this.messageRouter.getFactory().createMessage({
        messageType: 'STATE.MUTATION',
        payload: mutation,
        targetEngine: 'aegis-state-sync'
      });
      await this.messageRouter.send(msg);
    }
  }

  async sendMutationWithAck(mutation: IStateMutation, targetNodeId: string, timeoutMs: number = 5000): Promise<boolean> {
    try {
      const resp = await this.messageRouter.request<{ success: boolean }>(
        targetNodeId,
        'STATE.MUTATION',
        mutation,
        { targetEngine: 'aegis-state-sync', timeoutMs }
      );
      return resp.success === true;
    } catch {
      return false;
    }
  }

  async initiateAntiEntropySync(targetNodeId: string): Promise<void> {
    this.setPeerSyncStatus(targetNodeId, StateSyncStatus.SYNCING);
    try {
      const localRecords = await this.stateStore.listRecords();
      const manifest = localRecords
        .filter(r => r.scope === 'DISTRIBUTED')
        .map(r => ({ key: r.key, version: r.versionInfo.version, originNodeId: r.versionInfo.originNodeId }));

      const response = await this.messageRouter.request<{ missingKeys: string[]; outdatedKeys: string[] }>(
        targetNodeId,
        'STATE.SYNC_REQUEST',
        { manifest },
        { targetEngine: 'aegis-state-sync', timeoutMs: 10000 }
      );

      if (response.missingKeys && response.missingKeys.length > 0) {
        for (const key of response.missingKeys) {
          const rec = await this.stateStore.getRecord(key);
          if (rec) {
            const mutMsg = this.messageRouter.getFactory().createMessage({
              messageType: 'STATE.MUTATION',
              payload: {
                mutationId: `aegis-state-mutation://sync-${key}-${rec.versionInfo.version}`,
                originNodeId: rec.versionInfo.originNodeId,
                timestamp: rec.updatedAt,
                key: rec.key,
                operation: rec.deleted ? 'DELETE' : 'UPDATE',
                value: rec.value,
                scope: rec.scope
              },
              targetNodeId: targetNodeId,
              targetEngine: 'aegis-state-sync'
            });
            await this.messageRouter.send(mutMsg);
          }
        }
      }

      this.setPeerSyncStatus(targetNodeId, StateSyncStatus.SYNCHRONIZED);
    } catch (err: any) {
      this.setPeerSyncStatus(targetNodeId, StateSyncStatus.FAILED);
      console.error(`[AEGIS State] Anti-entropy sync failed with ${targetNodeId}: ${err.message}`);
    }
  }

  private registerStateMessageHandlers(): void {
    this.messageRouter.getLocalBus().registerEngine('aegis-state-sync', async (envelope) => {
      const type = envelope.messageType;

      // 1. Ingress STATE.MUTATION
      if (type === 'STATE.MUTATION') {
        const mutation = envelope.payload as IStateMutation;

        // Deduplication check
        if (this.deduplicationRegistry.isDuplicate(mutation.mutationId)) {
          if (envelope.requiresAck || envelope.messageType.startsWith('REQUEST')) {
            const ackResp = this.messageRouter.getFactory().createResponse(envelope, { success: true, duplicate: true });
            await this.messageRouter.send(ackResp);
          }
          return;
        }

        this.deduplicationRegistry.register(mutation.mutationId);

        try {
          const existing = await this.stateStore.getRecord(mutation.key);
          if (!existing) {
            if (mutation.operation === 'DELETE') {
              // Delete on missing record -> ignore
            } else {
              await this.stateStore.createRecord(mutation);
            }
          } else {
            const comp = StateVersionManager.compareRecordVersions(existing, mutation);
            if (comp === 'NEWER') {
              if (mutation.operation === 'DELETE') {
                await this.stateStore.deleteRecord(mutation.key, mutation.mutationId, mutation.originNodeId);
              } else {
                await this.stateStore.updateRecord(mutation);
              }
            } else if (comp === 'CONFLICT') {
              const res = StateConflictResolver.resolveConflict(existing, mutation);
              if (res.acceptIncoming) {
                if (mutation.operation === 'DELETE') {
                  await this.stateStore.deleteRecord(mutation.key, mutation.mutationId, mutation.originNodeId);
                } else {
                  await this.stateStore.updateRecord(mutation);
                }
              }
            }
          }

          if (envelope.requiresAck || envelope.messageType.startsWith('REQUEST')) {
            const resp = this.messageRouter.getFactory().createResponse(envelope, { success: true });
            await this.messageRouter.send(resp);
          }
        } catch (err: any) {
          if (envelope.requiresAck || envelope.messageType.startsWith('REQUEST')) {
            const errResp = this.messageRouter.getFactory().createResponse(envelope, { success: false, error: err.message });
            await this.messageRouter.send(errResp);
          }
        }
        return;
      }

      // 2. Ingress STATE.SYNC_REQUEST (Anti-entropy manifest comparison)
      if (type === 'STATE.SYNC_REQUEST') {
        const { manifest } = envelope.payload as { manifest: Array<{ key: string; version: number }> };
        const localRecords = await this.stateStore.listRecords();

        const localMap = new Map(localRecords.map(r => [r.key, r.versionInfo.version]));
        const remoteMap = new Map(manifest.map(m => [m.key, m.version]));

        const missingKeys: string[] = [];
        const outdatedKeys: string[] = [];

        for (const [lKey, lVer] of localMap.entries()) {
          const rVer = remoteMap.get(lKey);
          if (rVer === undefined) {
            missingKeys.push(lKey);
          } else if (lVer > rVer) {
            outdatedKeys.push(lKey);
          }
        }

        const resp = this.messageRouter.getFactory().createResponse(envelope, { missingKeys, outdatedKeys });
        await this.messageRouter.send(resp);
        return;
      }
    });
  }
}
