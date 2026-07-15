import { IDataConnector, RawSample } from '../interfaces/IDataConnector.js';
export declare class ConversationConnector implements IDataConnector {
    readonly id: string;
    readonly type = "Conversation";
    private connected;
    private isEnabled;
    constructor(id: string);
    connect(config?: {
        enabled?: boolean;
    }): Promise<void>;
    disconnect(): Promise<void>;
    collect(): Promise<RawSample[]>;
    validate(): Promise<boolean>;
    watch(onChange: (event: any) => void): Promise<void>;
    metadata(): Promise<Record<string, any>>;
    statistics(): Promise<Record<string, any>>;
}
