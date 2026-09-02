import { IAegisStateRecord, IStateMutation, IStateTombstone } from '@aegis/sdk';
import { IStorageAdapter } from '../storage/IStorageAdapter.js';
export declare class AegisStateStore {
    private readonly localNodeId;
    private readonly storageAdapter;
    private readonly maxStateValueSizeBytes;
    constructor(localNodeId: string, storageAdapter: IStorageAdapter, maxStateValueSizeBytes?: number);
    initialize(): Promise<void>;
    validateKeyNamespace(key: string): void;
    validateValueSize(value: any): void;
    getRecord<T = unknown>(key: string): Promise<IAegisStateRecord<T> | undefined>;
    createRecord<T = unknown>(mutation: IStateMutation<T>): Promise<IAegisStateRecord<T>>;
    updateRecord<T = unknown>(mutation: IStateMutation<T>): Promise<IAegisStateRecord<T>>;
    applyRecordDirectly<T = unknown>(record: IAegisStateRecord<T>): Promise<void>;
    deleteRecord(key: string, mutationId: string, originNodeId?: string): Promise<IStateTombstone | void>;
    listRecords(prefix?: string): Promise<IAegisStateRecord[]>;
    close(): Promise<void>;
}
