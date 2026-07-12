export class MemoryRegistry {
    static instance = new MemoryRegistry();
    modules = new Map();
    static getInstance() {
        return this.instance;
    }
    register(name, module) {
        this.modules.set(name, module);
    }
    unregister(name) {
        this.modules.delete(name);
    }
    get(name) {
        return this.modules.get(name);
    }
    list() {
        return Array.from(this.modules.values());
    }
}
export const memoryRegistry = MemoryRegistry.getInstance();
