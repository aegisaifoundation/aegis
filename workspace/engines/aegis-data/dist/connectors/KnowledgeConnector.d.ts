import { IDataConnector, RawSample } from '../interfaces/IDataConnector.js';
export declare class KnowledgeConnector implements IDataConnector {
    readonly id: string;
    readonly type = "Knowledge";
    private connected;
    constructor(id: string);
    connect(config?: any): Promise<void>;
    disconnect(): Promise<void>;
    collect(): Promise<RawSample[]>;
    validate(): Promise<boolean>;
    watch(onChange: (event: any) => void): Promise<void>;
    metadata(): Promise<Record<string, any>>;
    statistics(): Promise<Record<string, any>>;
}
