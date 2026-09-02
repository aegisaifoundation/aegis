import { IStorageAdapter } from './IStorageAdapter.js';
import { StateError, StateErrorCode } from '@aegis/sdk';

export class SQLiteStorageAdapter implements IStorageAdapter {
  constructor(private readonly dbPath: string = '.aegis/state/state.db') {}

  async initialize(): Promise<void> {
    console.warn('[AEGIS State] SQLiteStorageAdapter is an optional deferred storage stub. Use FileStorageAdapter as production baseline.');
  }

  async get<T>(_key: string): Promise<T | undefined> {
    throw new StateError(
      StateErrorCode.STATE_STORAGE_FAILURE,
      'SQLiteStorageAdapter is deferred in Phase 5. Use FileStorageAdapter or MemoryStorageAdapter.'
    );
  }

  async set<T>(_key: string, _value: T): Promise<void> {
    throw new StateError(
      StateErrorCode.STATE_STORAGE_FAILURE,
      'SQLiteStorageAdapter is deferred in Phase 5. Use FileStorageAdapter or MemoryStorageAdapter.'
    );
  }

  async delete(_key: string): Promise<void> {
    throw new StateError(
      StateErrorCode.STATE_STORAGE_FAILURE,
      'SQLiteStorageAdapter is deferred in Phase 5. Use FileStorageAdapter or MemoryStorageAdapter.'
    );
  }

  async has(_key: string): Promise<boolean> {
    return false;
  }

  async list(_prefix?: string): Promise<string[]> {
    return [];
  }

  async close(): Promise<void> {}
}
