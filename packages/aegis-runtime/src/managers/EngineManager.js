import { RegistryLoader } from '../registry/RegistryLoader.js';
export class EngineManager {
    engines = new Map();
    startedEngines = [];
    context = null;
    isSubscribed = false;
    register(engine) {
        if (this.engines.has(engine.metadata.id)) {
            throw new Error(`Engine with ID ${engine.metadata.id} is already registered.`);
        }
        this.engines.set(engine.metadata.id, engine);
    }
    get(id) {
        return this.engines.get(id);
    }
    list() {
        return Array.from(this.engines.values());
    }
    async discoverAndLoad(context) {
        this.context = context;
        // 1. Subscribe to events on EventBus
        if (!this.isSubscribed) {
            const bus = context.getEventBus();
            if (bus) {
                bus.on('RuntimeRegistryUpdated', async (payload) => {
                    console.log('[EngineManager] Registry change detected via EventBus payload:', payload);
                    try {
                        await this.reload();
                    }
                    catch (err) {
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
            }
            catch (err) {
                console.error(`[EngineManager] Failed to instantiate engine ${engine.entry.id}:`, err.message || err);
            }
        }
    }
    // --- Granular Lifecycle Control Methods ---
    async reload() {
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
    async reloadEngine(engineId) {
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
    async startEngine(engineId) {
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
    async stopEngine(engineId) {
        const engine = this.engines.get(engineId);
        if (!engine) {
            console.log(`[EngineManager] Engine "${engineId}" is not currently registered.`);
            return;
        }
        console.log(`[EngineManager] Stopping engine "${engineId}"...`);
        try {
            await engine.shutdown();
        }
        catch (e) {
            console.error(`[EngineManager] Error shutting down engine ${engineId}:`, e.message || e);
        }
        this.startedEngines = this.startedEngines.filter(id => id !== engineId);
        this.engines.delete(engineId);
    }
    // --- Lifecycle Executions ---
    getLoadOrder() {
        const visited = new Set();
        const temp = new Set();
        const order = [];
        const visit = (id) => {
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
    async initializeAll(context) {
        const order = this.getLoadOrder();
        for (const id of order) {
            const engine = this.engines.get(id);
            try {
                console.log(`[EngineManager] Initializing engine: ${engine.metadata.displayName}...`);
                await engine.initialize(context);
            }
            catch (err) {
                throw new Error(`ENGN-4003: Failed to initialize engine ${id}: ${err.message || err}`);
            }
        }
    }
    async startAll() {
        const order = this.getLoadOrder();
        for (const id of order) {
            const engine = this.engines.get(id);
            if (engine.metadata.autoStart && !this.startedEngines.includes(id)) {
                try {
                    console.log(`[EngineManager] Starting engine: ${engine.metadata.displayName}...`);
                    await engine.start();
                    this.startedEngines.push(id);
                }
                catch (err) {
                    throw new Error(`ENGN-4004: Failed to start engine ${id}: ${err.message || err}`);
                }
            }
        }
    }
    async shutdownAll() {
        const order = [...this.startedEngines].reverse();
        for (const id of order) {
            const engine = this.engines.get(id);
            if (engine) {
                try {
                    console.log(`[EngineManager] Shutting down engine: ${engine.metadata.displayName}...`);
                    await engine.shutdown();
                }
                catch (err) {
                    console.error(`[EngineManager] Error shutting down engine ${id}:`, err);
                }
            }
        }
        this.startedEngines = [];
    }
}
export const engineManager = new EngineManager();
