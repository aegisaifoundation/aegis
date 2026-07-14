import { Bootloader } from '@aegis/runtime';
import { serviceRegistry } from '@aegis/runtime';
export class NodeRuntime {
    kernelApi = null;
    async boot() {
        if (this.kernelApi && this.kernelApi.status === 'ACTIVE') {
            return;
        }
        console.log('[NodeRuntime] Booting AEGIS Core Runtime...');
        this.kernelApi = await Bootloader.boot();
    }
    async shutdown() {
        if (this.kernelApi) {
            console.log('[NodeRuntime] Shutting down AEGIS Core Runtime...');
            await this.kernelApi.shutdown();
            this.kernelApi = null;
        }
    }
    getStatus() {
        return this.kernelApi ? this.kernelApi.status : 'INACTIVE';
    }
    // --- Engine Lifecycle Control ---
    getEngineManager() {
        const mgr = serviceRegistry.get('engineManager');
        if (!mgr) {
            throw new Error('EngineManager is not available in ServiceRegistry. Ensure runtime is booted.');
        }
        return mgr;
    }
    async loadEngine(engineId) {
        // Under the hood, this loads the registry and instantiates it
        await this.getEngineManager().reloadEngine(engineId);
    }
    async unloadEngine(engineId) {
        // Stopping deletes it from registry
        await this.getEngineManager().stopEngine(engineId);
    }
    async startEngine(engineId) {
        await this.getEngineManager().startEngine(engineId);
    }
    async stopEngine(engineId) {
        await this.getEngineManager().stopEngine(engineId);
    }
    async restartEngine(engineId) {
        await this.getEngineManager().reloadEngine(engineId);
    }
    getEngines() {
        try {
            const mgr = this.getEngineManager();
            const enginesList = mgr.list();
            const started = mgr.startedEngines || [];
            return enginesList.map((e) => ({
                id: e.metadata.id,
                name: e.metadata.displayName,
                state: started.includes(e.metadata.id) ? 'RUNNING' : 'STOPPED'
            }));
        }
        catch {
            return [];
        }
    }
}
//# sourceMappingURL=NodeRuntime.js.map