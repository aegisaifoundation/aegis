import { randomUUID } from 'crypto';
import { AegisStateScope, StateWriteConsistency, StateError, StateErrorCode } from '@aegis/sdk';
import { AegisStateStore } from './AegisStateStore.js';
import { StateReplicationManager } from './StateReplicationManager.js';
import { StateSynchronizationManager } from './StateSynchronizationManager.js';
export class AegisStateManager {
    localNodeId;
    storageAdapter;
    messageRouter;
    peerRegistry;
    stateStore;
    replicationManager;
    syncManager;
    eventListeners = new Map();
    constructor(localNodeId, storageAdapter, messageRouter, peerRegistry) {
        this.localNodeId = localNodeId;
        this.storageAdapter = storageAdapter;
        this.messageRouter = messageRouter;
        this.peerRegistry = peerRegistry;
        this.stateStore = new AegisStateStore(localNodeId, storageAdapter);
        this.replicationManager = new StateReplicationManager(localNodeId);
        this.syncManager = new StateSynchronizationManager(localNodeId, messageRouter, this.stateStore);
    }
    async initialize() {
        await this.stateStore.initialize();
        this.emitEvent('STATE_RESTORED', { timestamp: Date.now() });
    }
    getStateStore() {
        return this.stateStore;
    }
    getSyncManager() {
        return this.syncManager;
    }
    async getState(key) {
        const record = await this.stateStore.getRecord(key);
        if (!record || record.deleted)
            return undefined;
        return record;
    }
    async createState(key, value, options) {
        const mutationId = `aegis-state-mutation://${randomUUID()}`;
        const scope = options?.scope ?? AegisStateScope.NODE;
        const mutation = {
            mutationId,
            originNodeId: this.localNodeId,
            timestamp: Date.now(),
            key,
            operation: 'CREATE',
            value,
            scope,
            metadata: options?.metadata
        };
        const record = await this.stateStore.createRecord(mutation);
        this.emitEvent('STATE_CREATED', record);
        if (scope === AegisStateScope.DISTRIBUTED) {
            await this.handleReplication(mutation, options?.replicationPolicy);
        }
        return record;
    }
    async updateState(key, value, options) {
        const mutationId = `aegis-state-mutation://${randomUUID()}`;
        const scope = options?.scope ?? AegisStateScope.NODE;
        const mutation = {
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
        const record = await this.stateStore.updateRecord(mutation);
        this.emitEvent('STATE_UPDATED', record);
        if (scope === AegisStateScope.DISTRIBUTED) {
            await this.handleReplication(mutation, options?.replicationPolicy);
        }
        return record;
    }
    async deleteState(key, options) {
        const record = await this.stateStore.getRecord(key);
        if (!record)
            return;
        const mutationId = `aegis-state-mutation://${randomUUID()}`;
        const tombstone = await this.stateStore.deleteRecord(key, mutationId, this.localNodeId);
        this.emitEvent('STATE_DELETED', { key, tombstone });
        if (record.scope === AegisStateScope.DISTRIBUTED) {
            const deleteMutation = {
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
    async listState(prefix) {
        const records = await this.stateStore.listRecords(prefix);
        return records.filter(r => !r.deleted);
    }
    async handleReplication(mutation, policy) {
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
                    throw new StateError(StateErrorCode.STATE_REPLICATION_FAILURE, `Required target acknowledgement failed for node "${targetId}" on key "${mutation.key}".`);
                }
            }
        }
        else {
            await this.syncManager.broadcastMutation(mutation, targets);
        }
        this.emitEvent('STATE_REPLICATED', { mutationId: mutation.mutationId, targets });
    }
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event).add(callback);
    }
    emitEvent(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            for (const cb of listeners) {
                cb(data);
            }
        }
    }
}
