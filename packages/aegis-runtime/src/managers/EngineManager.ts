import { IEngine } from '@aegis/sdk';

export class EngineManager {
  private engines = new Map<string, IEngine>();
  private startedEngines: string[] = [];

  public register(engine: IEngine): void {
    if (this.engines.has(engine.metadata.id)) {
      throw new Error(`Engine with ID ${engine.metadata.id} is already registered.`);
    }
    this.engines.set(engine.metadata.id, engine);
  }

  public get(id: string): IEngine | undefined {
    return this.engines.get(id);
  }

  public list(): IEngine[] {
    return Array.from(this.engines.values());
  }

  public getLoadOrder(): string[] {
    const visited = new Set<string>();
    const temp = new Set<string>();
    const order: string[] = [];

    const visit = (id: string) => {
      if (temp.has(id)) {
        throw new Error(`ENGN-4002: Circular dependency detected involving engine ${id}`);
      }
      if (!visited.has(id)) {
        temp.add(id);
        const engine = this.engines.get(id);
        if (engine && engine.metadata.dependencies) {
          for (const depId of engine.metadata.dependencies) {
            if (!this.engines.has(depId)) {
              throw new Error(`ENGN-4001: Missing engine dependency: ${depId} required by ${id}`);
            }
            visit(depId);
          }
        }
        temp.delete(id);
        visited.add(id);
        order.push(id);
      }
    };

    for (const id of this.engines.keys()) {
      visit(id);
    }

    return order;
  }

  public async initializeAll(context: any): Promise<void> {
    const order = this.getLoadOrder();
    for (const id of order) {
      const engine = this.engines.get(id)!;
      try {
        console.log(`[EngineManager] Initializing engine: ${engine.metadata.displayName}...`);
        await engine.initialize(context);
      } catch (err: any) {
        throw new Error(`ENGN-4003: Failed to initialize engine ${id}: ${err.message || err}`);
      }
    }
  }

  public async startAll(): Promise<void> {
    const order = this.getLoadOrder();
    for (const id of order) {
      const engine = this.engines.get(id)!;
      if (engine.metadata.autoStart) {
        try {
          console.log(`[EngineManager] Starting engine: ${engine.metadata.displayName}...`);
          await engine.start();
          this.startedEngines.push(id);
        } catch (err: any) {
          throw new Error(`ENGN-4004: Failed to start engine ${id}: ${err.message || err}`);
        }
      }
    }
  }

  public async shutdownAll(): Promise<void> {
    const order = [...this.startedEngines].reverse();
    for (const id of order) {
      const engine = this.engines.get(id);
      if (engine) {
        try {
          console.log(`[EngineManager] Shutting down engine: ${engine.metadata.displayName}...`);
          await engine.shutdown();
        } catch (err) {
          console.error(`[EngineManager] Error shutting down engine ${id}:`, err);
        }
      }
    }
    this.startedEngines = [];
  }
}

export const engineManager = new EngineManager();
