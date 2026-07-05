export class MemoryModuleRegistry {
    static instance = new MemoryModuleRegistry();
    modules = new Map();
    static getInstance() {
        return this.instance;
    }
    register(name, module) {
        if (this.modules.has(name)) {
            throw new Error(`Memory module ${name} is already registered.`);
        }
        this.modules.set(name, module);
    }
    unregister(name) {
        this.modules.delete(name);
    }
    resolve(name) {
        return this.modules.get(name);
    }
    resolveByType(type) {
        return Array.from(this.modules.values()).filter(m => m.type === type);
    }
    list() {
        return Array.from(this.modules.values());
    }
    clear() {
        this.modules.clear();
    }
}
export const memoryModuleRegistry = MemoryModuleRegistry.getInstance();
