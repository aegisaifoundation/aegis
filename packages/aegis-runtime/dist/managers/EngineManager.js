export class EngineManager {
    engines = new Map();
    startedEngines = [];
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
            if (engine.metadata.autoStart) {
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
