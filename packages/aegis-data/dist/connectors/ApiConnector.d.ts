import { IDataConnector, RawSample } from '../interfaces/IDataConnector.js';
export declare class ApiConnector implements IDataConnector {
    readonly id: string;
    readonly type = "API";
    private connected;
    private endpoint;
    private encryptedApiKey;
    private encryptionKey;
    constructor(id: string);
    connect(config: {
        endpoint: string;
        apiKey?: string;
    }): Promise<void>;
    disconnect(): Promise<void>;
    collect(): Promise<RawSample[]>;
    validate(): Promise<boolean>;
    watch(onChange: (event: any) => void): Promise<void>;
    metadata(): Promise<Record<string, any>>;
    statistics(): Promise<Record<string, any>>;
    private encryptCredentials;
    private decryptCredentials;
}
