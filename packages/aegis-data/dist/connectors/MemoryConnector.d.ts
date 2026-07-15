import { IDataConnector, RawSample } from '../interfaces/IDataConnector.js';
export declare class MemoryConnector implements IDataConnector {
    readonly id: string;
    readonly type = "Memory";
    private connected;
    private sessionIds;
    constructor(id: string);
    connect(config?: {
        sessionIds?: string[];
    }): Promise<void>;
    disconnect(): Promise<void>;
    collect(): Promise<RawSample[]>;
    validate(): Promise<boolean>;
    watch(onChange: (event: any) => void): Promise<void>;
    metadata(): Promise<Record<string, any>>;
    statistics(): Promise<Record<string, any>>;
}
