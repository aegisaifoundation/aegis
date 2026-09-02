export interface IStorageAdapter {
  initialize(): Promise<void>;
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  has(key: string): Promise<boolean>;
  list(prefix?: string): Promise<string[]>;
  close(): Promise<void>;
}
