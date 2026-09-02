import { randomUUID } from 'crypto';
import {
  IAegisStateRecord,
  IStateMutation,
  AegisStateScope,
  IStateReplicationPolicy,
  StateWriteConsistency,
  StateError,
  StateErrorCode
} from '@aegis/sdk';
import { AegisStateStore } from './AegisStateStore.js';
import { StateReplicationManager } from './StateReplicationManager.js';
import { StateSynchronizationManager } from './StateSynchronizationManager.js';
import { IStorageAdapter } from '../storage/IStorageAdapter.js';
import { AegisMessageRouter } from '../communication/AegisMessageRouter.js';
import { PeerRegistry } from '../networking/PeerRegistry.js';

export interface SetStateOptions {
  scope?: AegisStateScope;
  expectedVersion?: number;
  replicationPolicy?: IStateReplicationPolicy;
  metadata?: Record<string, unknown>;
}

export class AegisStateManager {
  private stateStore: AegisStateStore;
  private replicationManager: StateReplicationManager;
  private syncManager: StateSynchronizationManager;
  private eventListeners = new Map<string, Set<(data: any) => void>>();

  constructor(
    private readonly localNodeId: string,
    private readonly storageAdapter: IStorageAdapter,
    private readonly messageRouter: AegisMessageRouter,
    private readonly peerRegistry: PeerRegistry
  ) {
    this.stateStore = new AegisStateStore(localNodeId, storageAdapter);
    this.replicationManager = new StateReplicationManager(localNodeId);
    this.syncManager = new StateSynchronizationManager(localNodeId, messageRouter, this.stateStore);
  }

  async initialize(): Promise<void> {
    await this.stateStore.initialize();
    this.emitEvent('STATE_RESTORED', { timestamp: Date.now() });
  }

  getStateStore(): AegisStateStore {
    return this.stateStore;
  }

  getSyncManager(): StateSynchronizationManager {
    return this.syncManager;
  }

  async getState<T = unknown>(key: string): Promise<IAegisStateRecord<T> | undefined> {
    const record = await this.stateStore.getRecord<T>(key);
    if (!record || record.deleted) return undefined;
    return record;
  }

  async createState<T = unknown>(
    key: string,
    value: T,
    options?: SetStateOptions
  ): Promise<IAegisStateRecord<T>> {
    const mutationId = `aegis-state-mutation://${randomUUID()}`;
    const scope = options?.scope ?? AegisStateScope.NODE;
    const mutation: IStateMutation<T> = {
      mutationId,
      originNodeId: this.localNodeId,
      timestamp: Date.now(),
      key,
      operation: 'CREATE',
      value,
      scope,
      metadata: options?.metadata
    };

    const record = await this.stateStore.createRecord<T>(mutation);
    this.emitEvent('STATE_CREATED', record);

    if (scope === AegisStateScope.DISTRIBUTED) {
      await this.handleReplication(mutation, options?.replicationPolicy);
    }

    return record;
  }

  async updateState<T = unknown>(
    key: string,
    value: T,
    options?: SetStateOptions
  ): Promise<IAegisStateRecord<T>> {
    const mutationId = `aegis-state-mutation://${randomUUID()}`;
    const scope = options?.scope ?? AegisStateScope.NODE;
    const mutation: IStateMutation<T> = {
      mutationId,
      originNodeId: this.localNodeId,
      timestamp: Date.now(),
      key,
      operation: 'UPDATE',
      value,
      expectedVersion: options?.expectedVersion,
      scope,
      metadata: options?.metadata
    };

    const record = await this.stateStore.updateRecord<T>(mutation);
    this.emitEvent('STATE_UPDATED', record);

    if (scope === AegisStateScope.DISTRIBUTED) {
      await this.handleReplication(mutation, options?.replicationPolicy);
    }

    return record;
  }

  async deleteState(key: string, options?: SetStateOptions): Promise<void> {
    const record = await this.stateStore.getRecord(key);
    if (!record) return;

    const mutationId = `aegis-state-mutation://${randomUUID()}`;
    const tombstone = await this.stateStore.deleteRecord(key, mutationId, this.localNodeId);
    this.emitEvent('STATE_DELETED', { key, tombstone });

    if (record.scope === AegisStateScope.DISTRIBUTED) {
      const deleteMutation: IStateMutation = {
        mutationId,
        originNodeId: this.localNodeId,
        timestamp: Date.now(),
        key,
        operation: 'DELETE',
        scope: AegisStateScope.DISTRIBUTED
      };
      await this.handleReplication(deleteMutation, options?.replicationPolicy);
    }
  }

  async listState(prefix?: string): Promise<IAegisStateRecord[]> {
    const records = await this.stateStore.listRecords(prefix);
    return records.filter(r => !r.deleted);
  }

  private async handleReplication(
    mutation: IStateMutation,
    policy?: IStateReplicationPolicy
  ): Promise<void> {
    const availablePeers = this.peerRegistry.listPeers().map(p => p.nodeId);
    const targets = this.replicationManager.selectReplicationTargets(policy, availablePeers);

    if (targets.length === 0) {
      await this.syncManager.broadcastMutation(mutation);
      return;
    }

    const consistency = policy?.consistency ?? StateWriteConsistency.BEST_EFFORT;

    if (consistency === StateWriteConsistency.REQUIRE_TARGET_ACK) {
      for (const targetId of targets) {
        const success = await this.syncManager.sendMutationWithAck(mutation, targetId);
        if (!success) {
          throw new StateError(
            StateErrorCode.STATE_REPLICATION_FAILURE,
            `Required target acknowledgement failed for node "${targetId}" on key "${mutation.key}".`
          );
        }
      }
    } else {
      await this.syncManager.broadcastMutation(mutation, targets);
    }

    this.emitEvent('STATE_REPLICATED', { mutationId: mutation.mutationId, targets });
  }

  on(event: string, callback: (data: any) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  private emitEvent(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const cb of listeners) {
        cb(data);
      }
    }
  }
}
