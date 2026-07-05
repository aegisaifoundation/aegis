export class ServiceRegistry {
  private static instance = new ServiceRegistry();
  private services = new Map<string, any>();

  static getInstance(): ServiceRegistry {
    return this.instance;
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
