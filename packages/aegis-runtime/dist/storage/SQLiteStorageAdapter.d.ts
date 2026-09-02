import { IStorageAdapter } from './IStorageAdapter.js';
export declare class SQLiteStorageAdapter implements IStorageAdapter {
    private readonly dbPath;
    constructor(dbPath?: string);
    initialize(): Promise<void>;
    get<T>(_key: string): Promise<T | undefined>;
    set<T>(_key: string, _value: T): Promise<void>;
    delete(_key: string): Promise<void>;
    has(_key: string): Promise<boolean>;
    list(_prefix?: string): Promise<string[]>;
    close(): Promise<void>;
}
