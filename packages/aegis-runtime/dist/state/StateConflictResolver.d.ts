import { IAegisStateRecord, IStateMutation, StateConflictStrategy } from '@aegis/sdk';
export declare class StateConflictResolver {
    static resolveConflict<T>(localRecord: IAegisStateRecord<T>, incomingMutation: IStateMutation<T>, strategy?: StateConflictStrategy): {
        acceptIncoming: boolean;
        winnerValue?: T;
        winnerVersion?: number;
    };
}
