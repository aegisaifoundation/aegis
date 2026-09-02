import { IStateMutation, StateSyncStatus } from '@aegis/sdk';
import { AegisMessageRouter } from '../communication/AegisMessageRouter.js';
import { AegisStateStore } from './AegisStateStore.js';
export declare class StateSynchronizationManager {
    private readonly localNodeId;
    private readonly messageRouter;
    private readonly stateStore;
    private peerSyncStatus;
    private deduplicationRegistry;
    constructor(localNodeId: string, messageRouter: AegisMessageRouter, stateStore: AegisStateStore);
    getPeerSyncStatus(peerNodeId: string): StateSyncStatus;
    setPeerSyncStatus(peerNodeId: string, status: StateSyncStatus): void;
    broadcastMutation(mutation: IStateMutation, targetNodeIds?: string[]): Promise<void>;
    sendMutationWithAck(mutation: IStateMutation, targetNodeId: string, timeoutMs?: number): Promise<boolean>;
    initiateAntiEntropySync(targetNodeId: string): Promise<void>;
    private registerStateMessageHandlers;
}
