import fs from 'fs';
import path from 'path';
import { IEngine } from '@aegis/sdk';
import { RegistryLoader } from '../registry/RegistryLoader.js';

export class EngineManager {
  private engines = new Map<string, IEngine>();
  private startedEngines: string[] = [];
  private context: any = null;
  private isSubscribed = false;

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

  public async discoverAndLoad(context: any): Promise<void> {
    this.context = context;

    // 1. Subscribe to events on EventBus
    if (!this.isSubscribed) {
      const bus = context.getEventBus();
      if (bus) {
        bus.on('RuntimeRegistryUpdated', async (payload: any) => {
          console.log('[EngineManager] Registry change detected via EventBus payload:', payload);
          try {
            await this.reload();
          } catch (err: any) {
            console.error('[EngineManager] Auto-reload failed on RuntimeRegistryUpdated event:', err.message);
          }
        });
        this.isSubscribed = true;
      }
    }

    // 2. Load registry engines via RegistryLoader
    const validatedEngines = await RegistryLoader.loadRegistry(context);

    for (const engine of validatedEngines) {
      try {
        const inst = new engine.classRef();
        this.register(inst);
        console.log(`[EngineManager] Registered discovered engine: ${engine.entry.id}`);
      } catch (err: any) {
        console.error(`[EngineManager] Failed to instantiate engine ${engine.entry.id}:`, err.message || err);
      }
    }
  }

  // --- Granular Lifecycle Control Methods ---

  public async reload(): Promise<void> {
    if (!this.context) {
      throw new Error('EngineManager has not been initialized with a runtime context yet.');
    }
    console.log('[EngineManager] Hot-reloading all registered engines...');
    await this.shutdownAll();
    this.engines.clear();
    this.startedEngines = [];
    
    await this.discoverAndLoad(this.context);
    await this.initializeAll(this.context);
    await this.startAll();
    console.log('[EngineManager] Hot-reload complete.');
  }

  public async reloadEngine(engineId: string): Promise<void> {
    if (!this.context) {
      throw new Error('EngineManager has not been initialized with a runtime context yet.');
    }
    console.log(`[EngineManager] Reloading single engine: ${engineId}`);
    
    // Stop and unregister if already loaded
    await this.stopEngine(engineId);

    // Load registry to find new entry
    const validatedEngines = await RegistryLoader.loadRegistry(this.context);
    const target = validatedEngines.find(e => e.entry.id.toLowerCase() === engineId.toLowerCase());
    
    if (!target) {
      throw new Error(`Engine "${engineId}" not found in validated registry entries.`);
    }

    const inst = new target.classRef();
    this.register(inst);
    await inst.initialize(this.context);
    
    if (inst.metadata.autoStart) {
      await inst.start();
      this.startedEngines.push(inst.metadata.id);
    }
    console.log(`[EngineManager] Engine "${engineId}" successfully reloaded.`);
  }

  public async startEngine(engineId: string): Promise<void> {
    if (!this.context) {
      throw new Error('EngineManager has not been initialized with a runtime context.');
    }
    const engine = this.engines.get(engineId);
    if (!engine) {
      throw new Error(`Engine "${engineId}" is not loaded.`);
    }

    if (this.startedEngines.includes(engineId)) {
      console.log(`[EngineManager] Engine "${engineId}" is already running.`);
      return;
    }

    console.log(`[EngineManager] Starting engine "${engineId}"...`);
    await engine.initialize(this.context);
    await engine.start();
    this.startedEngines.push(engineId);
  }

  public async stopEngine(engineId: string): Promise<void> {
    const engine = this.engines.get(engineId);
    if (!engine) {
      console.log(`[EngineManager] Engine "${engineId}" is not currently registered.`);
      return;
    }

    console.log(`[EngineManager] Stopping engine "${engineId}"...`);
    try {
      await engine.shutdown();
    } catch (e: any) {
      console.error(`[EngineManager] Error shutting down engine ${engineId}:`, e.message || e);
    }
    
    this.startedEngines = this.startedEngines.filter(id => id !== engineId);
    this.engines.delete(engineId);
  }

  // --- Lifecycle Executions ---

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
      if (engine.metadata.autoStart && !this.startedEngines.includes(id)) {
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
