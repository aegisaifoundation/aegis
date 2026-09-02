import { IStorageAdapter } from './IStorageAdapter.js';
export declare class FileStorageAdapter implements IStorageAdapter {
    private cache;
    private readonly filePath;
    private readonly tempPath;
    constructor(baseDir?: string);
    initialize(): Promise<void>;
    get<T>(key: string): Promise<T | undefined>;
    set<T>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<void>;
    has(key: string): Promise<boolean>;
    list(prefix?: string): Promise<string[]>;
    close(): Promise<void>;
    private flushToDisk;
}
