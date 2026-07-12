export interface IMemoryStore {
    read(key: string): Promise<any>;
    write(key: string, value: any): Promise<void>;
    delete(key: string): Promise<boolean>;
    exists(key: string): Promise<boolean>;
    clear(): Promise<void>;
}
