export class MemoryStorageAdapter {
    store = new Map();
    async initialize() { }
    async get(key) {
        return this.store.get(key);
    }
    async set(key, value) {
        this.store.set(key, value);
    }
    async delete(key) {
        this.store.delete(key);
    }
    async has(key) {
        return this.store.has(key);
    }
    async list(prefix) {
        const keys = Array.from(this.store.keys());
        if (!prefix)
            return keys;
        return keys.filter(k => k.startsWith(prefix));
    }
    async close() {
        this.store.clear();
    }
}
