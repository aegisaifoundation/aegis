import { AegisStateScope, StateError, StateErrorCode } from '@aegis/sdk';
export class AegisStateStore {
    localNodeId;
    storageAdapter;
    maxStateValueSizeBytes;
    constructor(localNodeId, storageAdapter, maxStateValueSizeBytes = 1048576 // 1 MB
    ) {
        this.localNodeId = localNodeId;
        this.storageAdapter = storageAdapter;
        this.maxStateValueSizeBytes = maxStateValueSizeBytes;
    }
    async initialize() {
        await this.storageAdapter.initialize();
    }
    validateKeyNamespace(key) {
        if (!key || typeof key !== 'string' || !key.includes('/')) {
            throw new StateError(StateErrorCode.INVALID_STATE_KEY, `Invalid state key "${key}". Must use namespaced format e.g. "aegis/task/123" or "engine/di/foo".`);
        }
    }
    validateValueSize(value) {
        if (value === undefined || value === null)
            return;
        const serialized = JSON.stringify(value);
        if (serialized.length > this.maxStateValueSizeBytes) {
            throw new StateError(StateErrorCode.STATE_SIZE_EXCEEDED, `State record value size (${serialized.length} bytes) exceeds max limit of ${this.maxStateValueSizeBytes} bytes.`);
        }
    }
    async getRecord(key) {
        this.validateKeyNamespace(key);
        return this.storageAdapter.get(key);
    }
    async createRecord(mutation) {
        this.validateKeyNamespace(mutation.key);
        this.validateValueSize(mutation.value);
        const existing = await this.storageAdapter.get(mutation.key);
        if (existing && !existing.deleted) {
            throw new StateError(StateErrorCode.STATE_ALREADY_EXISTS, `State record with key "${mutation.key}" already exists.`);
        }
        const now = Date.now();
        const record = {
            key: mutation.key,
            value: mutation.value,
            versionInfo: {
                version: 1,
                originNodeId: mutation.originNodeId || this.localNodeId
            },
            createdAt: now,
            updatedAt: now,
            createdByNodeId: mutation.originNodeId || this.localNodeId,
            updatedByNodeId: mutation.originNodeId || this.localNodeId,
            scope: mutation.scope,
            deleted: false,
            metadata: {
                ...mutation.metadata,
                lastMutationId: mutation.mutationId
            }
        };
        await this.storageAdapter.set(mutation.key, record);
        return record;
    }
    async updateRecord(mutation) {
        this.validateKeyNamespace(mutation.key);
        this.validateValueSize(mutation.value);
        const existing = await this.storageAdapter.get(mutation.key);
        if (!existing) {
            throw new StateError(StateErrorCode.STATE_NOT_FOUND, `State record with key "${mutation.key}" not found.`);
        }
        // Optimistic Concurrency Check
        if (mutation.expectedVersion !== undefined &&
            existing.versionInfo.version !== mutation.expectedVersion) {
            throw new StateError(StateErrorCode.STATE_VERSION_CONFLICT, `Version conflict on update for key "${mutation.key}". Expected version ${mutation.expectedVersion}, current version is ${existing.versionInfo.version}.`);
        }
        const now = Date.now();
        const updatedRecord = {
            ...existing,
            value: mutation.value,
            versionInfo: {
                version: existing.versionInfo.version + 1,
                originNodeId: mutation.originNodeId || this.localNodeId
            },
            updatedAt: now,
            updatedByNodeId: mutation.originNodeId || this.localNodeId,
            deleted: false,
            metadata: {
                ...existing.metadata,
                ...mutation.metadata,
                lastMutationId: mutation.mutationId
            }
        };
        await this.storageAdapter.set(mutation.key, updatedRecord);
        return updatedRecord;
    }
    async applyRecordDirectly(record) {
        this.validateKeyNamespace(record.key);
        await this.storageAdapter.set(record.key, record);
    }
    async deleteRecord(key, mutationId, originNodeId = this.localNodeId) {
        this.validateKeyNamespace(key);
        const existing = await this.storageAdapter.get(key);
        if (!existing)
            return;
        const now = Date.now();
        const tombstoneVersion = existing.versionInfo.version + 1;
        if (existing.scope === AegisStateScope.DISTRIBUTED) {
            // Create versioned tombstone for distributed deletion
            const tombstoneRecord = {
                ...existing,
                deleted: true,
                deletedAt: now,
                versionInfo: {
                    version: tombstoneVersion,
                    originNodeId
                },
                updatedAt: now,
                updatedByNodeId: originNodeId,
                metadata: {
                    ...existing.metadata,
                    lastMutationId: mutationId
                }
            };
            await this.storageAdapter.set(key, tombstoneRecord);
            return {
                key,
                mutationId,
                deletedAt: now,
                deletedByNodeId: originNodeId,
                version: tombstoneVersion
            };
        }
        // Local / Node scope: immediate removal
        await this.storageAdapter.delete(key);
    }
    async listRecords(prefix) {
        const keys = await this.storageAdapter.list(prefix);
        const records = [];
        for (const k of keys) {
            const rec = await this.storageAdapter.get(k);
            if (rec)
                records.push(rec);
        }
        return records;
    }
    async close() {
        await this.storageAdapter.close();
    }
}
