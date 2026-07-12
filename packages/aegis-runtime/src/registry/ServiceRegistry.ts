const REGISTRY_SYMBOL = Symbol.for('aegis.ServiceRegistry');

export class ServiceRegistry {
  private services = new Map<string, any>();

  static getInstance(): ServiceRegistry {
    if (!(globalThis as any)[REGISTRY_SYMBOL]) {
      (globalThis as any)[REGISTRY_SYMBOL] = new ServiceRegistry();
    }
    return (globalThis as any)[REGISTRY_SYMBOL];
  }

  register(name: string, service: any): void {
    this.services.set(name, service);
  }

  get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not found in registry.`);
    }
    return service;
  }

  has(name: string): boolean {
    return this.services.has(name);
  }
}

export const serviceRegistry = ServiceRegistry.getInstance();
