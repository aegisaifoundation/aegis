import {
  IAegisStateRecord,
  IStateMutation,
  IStateTombstone,
  AegisStateScope,
  StateError,
  StateErrorCode
} from '@aegis/sdk';
import { IStorageAdapter } from '../storage/IStorageAdapter.js';

export class AegisStateStore {
  constructor(
    private readonly localNodeId: string,
    private readonly storageAdapter: IStorageAdapter,
    private readonly maxStateValueSizeBytes: number = 1048576 // 1 MB
  ) {}

  async initialize(): Promise<void> {
    await this.storageAdapter.initialize();
  }

  validateKeyNamespace(key: string): void {
    if (!key || typeof key !== 'string' || !key.includes('/')) {
      throw new StateError(
        StateErrorCode.INVALID_STATE_KEY,
        `Invalid state key "${key}". Must use namespaced format e.g. "aegis/task/123" or "engine/di/foo".`
      );
    }
  }

  validateValueSize(value: any): void {
    if (value === undefined || value === null) return;
    const serialized = JSON.stringify(value);
    if (serialized.length > this.maxStateValueSizeBytes) {
      throw new StateError(
        StateErrorCode.STATE_SIZE_EXCEEDED,
        `State record value size (${serialized.length} bytes) exceeds max limit of ${this.maxStateValueSizeBytes} bytes.`
      );
    }
  }

  async getRecord<T = unknown>(key: string): Promise<IAegisStateRecord<T> | undefined> {
    this.validateKeyNamespace(key);
    return this.storageAdapter.get<IAegisStateRecord<T>>(key);
  }

  async createRecord<T = unknown>(
    mutation: IStateMutation<T>
  ): Promise<IAegisStateRecord<T>> {
    this.validateKeyNamespace(mutation.key);
    this.validateValueSize(mutation.value);

    const existing = await this.storageAdapter.get<IAegisStateRecord<T>>(mutation.key);
    if (existing && !existing.deleted) {
      throw new StateError(
        StateErrorCode.STATE_ALREADY_EXISTS,
        `State record with key "${mutation.key}" already exists.`
      );
    }

    const now = Date.now();
    const record: IAegisStateRecord<T> = {
      key: mutation.key,
      value: mutation.value as T,
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

  async updateRecord<T = unknown>(
    mutation: IStateMutation<T>
  ): Promise<IAegisStateRecord<T>> {
    this.validateKeyNamespace(mutation.key);
    this.validateValueSize(mutation.value);

    const existing = await this.storageAdapter.get<IAegisStateRecord<T>>(mutation.key);
    if (!existing) {
      throw new StateError(
        StateErrorCode.STATE_NOT_FOUND,
        `State record with key "${mutation.key}" not found.`
      );
    }

    // Optimistic Concurrency Check
    if (
      mutation.expectedVersion !== undefined &&
      existing.versionInfo.version !== mutation.expectedVersion
    ) {
      throw new StateError(
        StateErrorCode.STATE_VERSION_CONFLICT,
        `Version conflict on update for key "${mutation.key}". Expected version ${mutation.expectedVersion}, current version is ${existing.versionInfo.version}.`
      );
    }

    const now = Date.now();
    const updatedRecord: IAegisStateRecord<T> = {
      ...existing,
      value: mutation.value as T,
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

  async applyRecordDirectly<T = unknown>(record: IAegisStateRecord<T>): Promise<void> {
    this.validateKeyNamespace(record.key);
    await this.storageAdapter.set(record.key, record);
  }

  async deleteRecord(
    key: string,
    mutationId: string,
    originNodeId: string = this.localNodeId
  ): Promise<IStateTombstone | void> {
    this.validateKeyNamespace(key);
    const existing = await this.storageAdapter.get<IAegisStateRecord>(key);
    if (!existing) return;

    const now = Date.now();
    const tombstoneVersion = existing.versionInfo.version + 1;

    if (existing.scope === AegisStateScope.DISTRIBUTED) {
      // Create versioned tombstone for distributed deletion
      const tombstoneRecord: IAegisStateRecord = {
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

  async listRecords(prefix?: string): Promise<IAegisStateRecord[]> {
    const keys = await this.storageAdapter.list(prefix);
    const records: IAegisStateRecord[] = [];
    for (const k of keys) {
      const rec = await this.storageAdapter.get<IAegisStateRecord>(k);
      if (rec) records.push(rec);
    }
    return records;
  }

  async close(): Promise<void> {
    await this.storageAdapter.close();
  }
}
