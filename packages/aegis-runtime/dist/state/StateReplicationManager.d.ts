import { IStateReplicationPolicy } from '@aegis/sdk';
export declare class StateReplicationManager {
    private readonly localNodeId;
    constructor(localNodeId: string);
    selectReplicationTargets(policy: IStateReplicationPolicy | undefined, availablePeerNodeIds: string[]): string[];
}
