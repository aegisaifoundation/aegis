import { IDataConnector, RawSample } from '../interfaces/IDataConnector.js';
export declare class DatabaseConnector implements IDataConnector {
    readonly id: string;
    readonly type = "Database";
    private connected;
    private dbType;
    private approvedTables;
    private connectionString;
    constructor(id: string);
    connect(config: {
        type: 'SQLite' | 'MySQL' | 'PostgreSQL' | 'MongoDB';
        connectionString?: string;
        approvedTables: string[];
    }): Promise<void>;
    disconnect(): Promise<void>;
    collect(): Promise<RawSample[]>;
    validate(): Promise<boolean>;
    watch(onChange: (event: any) => void): Promise<void>;
    metadata(): Promise<Record<string, any>>;
    statistics(): Promise<Record<string, any>>;
}
