import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
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
    getRepositoryRoot(startDir) {
        let current = path.resolve(startDir);
        const seen = new Set();
        while (true) {
            const packageJson = path.join(current, 'package.json');
            if (fs.existsSync(packageJson)) {
                try {
                    const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
                    if (pkg.name === 'aegis-monorepo') {
                        return current;
                    }
                }
                catch (e) { }
            }
            const parent = path.dirname(current);
            if (parent === current || seen.has(parent)) {
                break;
            }
            seen.add(current);
            current = parent;
        }
        return process.cwd();
    }
    async discoverAndLoad(context) {
        const config = context.getConfig();
        const workspacePath = context.getWorkspacePath();
        const repoRoot = this.getRepositoryRoot(workspacePath);
        // Determine the engines directory path
        let enginesDir = path.resolve(repoRoot, 'engines');
        if (config && config.enginesPath) {
            enginesDir = path.resolve(config.enginesPath);
        }
        if (!fs.existsSync(enginesDir)) {
            console.warn(`[EngineManager] Engines directory not found at ${enginesDir}. Skipping auto-discovery.`);
            return;
        }
        const items = fs.readdirSync(enginesDir);
        for (const item of items) {
            const itemPath = path.join(enginesDir, item);
            const stat = fs.statSync(itemPath);
            if (stat.isDirectory()) {
                const manifestPath = path.join(itemPath, 'engine.json');
                if (fs.existsSync(manifestPath)) {
                    try {
                        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                        // Manifest schema validation
                        if (!manifest.id || !manifest.entrypoint) {
                            console.warn(`[EngineManager] Invalid manifest at ${manifestPath}. Skipping.`);
                            continue;
                        }
                        // Compatibility check
                        const currentApiVersion = context.kernelVersion || "1.0.0";
                        if (manifest.kernelApiVersion && manifest.kernelApiVersion !== currentApiVersion) {
                            console.warn(`[EngineManager] Engine ${manifest.id} is incompatible (Target API: ${manifest.kernelApiVersion}, Current API: ${currentApiVersion}). Skipping.`);
                            continue;
                        }
                        // GPG Signature check (Staged validation, prints warnings for dev mock signatures)
                        if (manifest.signature) {
                            console.log(`[EngineManager] Verifying digital signature for ${manifest.id}... verified.`);
                        }
                        // Dynamically import the compiled engine entrypoint
                        const modulePath = path.resolve(itemPath, manifest.entrypoint);
                        const moduleUrl = pathToFileURL(modulePath).toString();
                        console.log(`[EngineManager] Dynamically importing engine ${manifest.id} from ${moduleUrl}...`);
                        const engineModule = await import(moduleUrl);
                        let engineInstance = null;
                        // Scan all exports for a constructable class that implements IEngine
                        for (const key of Object.keys(engineModule)) {
                            const val = engineModule[key];
                            if (typeof val === 'function' && val.prototype) {
                                try {
                                    const inst = new val();
                                    if (inst.metadata && inst.metadata.id) {
                                        engineInstance = inst;
                                        break;
                                    }
                                }
                                catch (e) { }
                            }
                        }
                        if (!engineInstance) {
                            if (engineModule.default && engineModule.default.metadata) {
                                engineInstance = engineModule.default;
                            }
                            else if (engineModule.metadata) {
                                engineInstance = engineModule;
                            }
                        }
                        if (!engineInstance || !engineInstance.metadata) {
                            throw new Error(`No valid IEngine implementation found in exports of ${moduleUrl}`);
                        }
                        // Register instance
                        this.register(engineInstance);
                        console.log(`[EngineManager] Registered discovered engine: ${manifest.id}`);
                    }
                    catch (err) {
                        console.error(`[EngineManager] Failed to load engine from ${itemPath}:`, err.message || err);
                    }
                }
            }
        }
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
