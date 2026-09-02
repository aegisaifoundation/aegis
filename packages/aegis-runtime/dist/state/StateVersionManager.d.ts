import { IAegisStateRecord, IStateMutation } from '@aegis/sdk';
export type StateVersionComparison = 'NEWER' | 'OLDER' | 'IDENTICAL' | 'CONFLICT';
export declare class StateVersionManager {
    static compareRecordVersions(localRecord: IAegisStateRecord, remoteMutation: IStateMutation): StateVersionComparison;
    static evaluateLwwWinner<T>(recordA: {
        version: number;
        timestamp: number;
        nodeId: string;
        mutationId: string;
        value: T;
    }, recordB: {
        version: number;
        timestamp: number;
        nodeId: string;
        mutationId: string;
        value: T;
    }): 'A' | 'B';
}
