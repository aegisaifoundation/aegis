export class Container {
  private bindings = new Map<string, any>();
  private factories = new Map<string, (container: Container) => any>();
  private instances = new Map<string, any>();

  public bind<T>(name: string, value: T): void {
    this.bindings.set(name, value);
  }

  public factory<T>(name: string, creator: (container: Container) => T): void {
    this.factories.set(name, creator);
  }

  public singleton<T>(name: string, creator: (container: Container) => T): void {
    this.factories.set(name, (c) => {
      if (!this.instances.has(name)) {
        this.instances.set(name, creator(c));
      }
      return this.instances.get(name);
    });
  }

  public resolve<T>(name: string): T {
    if (this.instances.has(name)) {
      return this.instances.get(name);
    }
    if (this.factories.has(name)) {
      return this.factories.get(name)!(this);
    }
    if (this.bindings.has(name)) {
      return this.bindings.get(name);
    }
    throw new Error(`Dependency '${name}' could not be resolved.`);
  }

  public has(name: string): boolean {
    return this.instances.has(name) || this.factories.has(name) || this.bindings.has(name);
  }
}
