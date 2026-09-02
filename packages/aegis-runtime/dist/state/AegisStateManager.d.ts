import { IAegisStateRecord, AegisStateScope, IStateReplicationPolicy } from '@aegis/sdk';
import { AegisStateStore } from './AegisStateStore.js';
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
export declare class AegisStateManager {
    private readonly localNodeId;
    private readonly storageAdapter;
    private readonly messageRouter;
    private readonly peerRegistry;
    private stateStore;
    private replicationManager;
    private syncManager;
    private eventListeners;
    constructor(localNodeId: string, storageAdapter: IStorageAdapter, messageRouter: AegisMessageRouter, peerRegistry: PeerRegistry);
    initialize(): Promise<void>;
    getStateStore(): AegisStateStore;
    getSyncManager(): StateSynchronizationManager;
    getState<T = unknown>(key: string): Promise<IAegisStateRecord<T> | undefined>;
    createState<T = unknown>(key: string, value: T, options?: SetStateOptions): Promise<IAegisStateRecord<T>>;
    updateState<T = unknown>(key: string, value: T, options?: SetStateOptions): Promise<IAegisStateRecord<T>>;
    deleteState(key: string, options?: SetStateOptions): Promise<void>;
    listState(prefix?: string): Promise<IAegisStateRecord[]>;
    private handleReplication;
    on(event: string, callback: (data: any) => void): void;
    private emitEvent;
}
