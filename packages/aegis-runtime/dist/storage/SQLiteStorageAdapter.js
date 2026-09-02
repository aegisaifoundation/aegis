import { StateError, StateErrorCode } from '@aegis/sdk';
export class SQLiteStorageAdapter {
    dbPath;
    constructor(dbPath = '.aegis/state/state.db') {
        this.dbPath = dbPath;
    }
    async initialize() {
        console.warn('[AEGIS State] SQLiteStorageAdapter is an optional deferred storage stub. Use FileStorageAdapter as production baseline.');
    }
    async get(_key) {
        throw new StateError(StateErrorCode.STATE_STORAGE_FAILURE, 'SQLiteStorageAdapter is deferred in Phase 5. Use FileStorageAdapter or MemoryStorageAdapter.');
    }
    async set(_key, _value) {
        throw new StateError(StateErrorCode.STATE_STORAGE_FAILURE, 'SQLiteStorageAdapter is deferred in Phase 5. Use FileStorageAdapter or MemoryStorageAdapter.');
    }
    async delete(_key) {
        throw new StateError(StateErrorCode.STATE_STORAGE_FAILURE, 'SQLiteStorageAdapter is deferred in Phase 5. Use FileStorageAdapter or MemoryStorageAdapter.');
    }
    async has(_key) {
        return false;
    }
    async list(_prefix) {
        return [];
    }
    async close() { }
}
