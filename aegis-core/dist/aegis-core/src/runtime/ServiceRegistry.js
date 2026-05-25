export class ServiceRegistry {
    static instance = new ServiceRegistry();
    services = new Map();
    static getInstance() {
        return this.instance;
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
