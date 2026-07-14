import { Bootloader, KernelAPI } from '@aegis/runtime';
import { serviceRegistry } from '@aegis/runtime';

export class NodeRuntime {
  private kernelApi: KernelAPI | null = null;

  async boot(): Promise<void> {
    if (this.kernelApi && this.kernelApi.status === 'ACTIVE') {
      return;
    }
    console.log('[NodeRuntime] Booting AEGIS Core Runtime...');
    this.kernelApi = await Bootloader.boot();
  }

  async shutdown(): Promise<void> {
    if (this.kernelApi) {
      console.log('[NodeRuntime] Shutting down AEGIS Core Runtime...');
      await this.kernelApi.shutdown();
      this.kernelApi = null;
    }
  }

  getStatus(): string {
    return this.kernelApi ? this.kernelApi.status : 'INACTIVE';
  }

  // --- Engine Lifecycle Control ---
  private getEngineManager(): any {
    const mgr = serviceRegistry.get<any>('engineManager');
    if (!mgr) {
      throw new Error('EngineManager is not available in ServiceRegistry. Ensure runtime is booted.');
    }
    return mgr;
  }

  async loadEngine(engineId: string): Promise<void> {
    // Under the hood, this loads the registry and instantiates it
    await this.getEngineManager().reloadEngine(engineId);
  }

  async unloadEngine(engineId: string): Promise<void> {
    // Stopping deletes it from registry
    await this.getEngineManager().stopEngine(engineId);
  }

  async startEngine(engineId: string): Promise<void> {
    await this.getEngineManager().startEngine(engineId);
  }

  async stopEngine(engineId: string): Promise<void> {
    await this.getEngineManager().stopEngine(engineId);
  }

  async restartEngine(engineId: string): Promise<void> {
    await this.getEngineManager().reloadEngine(engineId);
  }

  getEngines(): Array<{ id: string; name: string; state: string }> {
    try {
      const mgr = this.getEngineManager();
      const enginesList = mgr.list();
      const started = mgr.startedEngines || [];
      return enginesList.map((e: any) => ({
        id: e.metadata.id,
        name: e.metadata.displayName,
        state: started.includes(e.metadata.id) ? 'RUNNING' : 'STOPPED'
      }));
    } catch {
      return [];
    }
  }
}
