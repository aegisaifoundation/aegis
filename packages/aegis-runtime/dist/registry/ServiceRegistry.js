const REGISTRY_SYMBOL = Symbol.for('aegis.ServiceRegistry');
export class ServiceRegistry {
    services = new Map();
    static getInstance() {
        if (!globalThis[REGISTRY_SYMBOL]) {
            globalThis[REGISTRY_SYMBOL] = new ServiceRegistry();
        }
        return globalThis[REGISTRY_SYMBOL];
    }
    register(name, service) {
        this.services.set(name, service);
    }
    get(name) {
        const service = this.services.get(name);
        if (!service) {
            throw new Error(`Service '${name}' not found in registry.`);
        }
        return service;
    }
    has(name) {
        return this.services.has(name);
    }
}
export const serviceRegistry = ServiceRegistry.getInstance();
