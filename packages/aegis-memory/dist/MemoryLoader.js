import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { memoryRegistry } from './MemoryRegistry.js';
import { runtimeServices, eventBus } from '@aegis/runtime';
export class MemoryLoader {
    getAegisCoreRoot() {
        let current = path.dirname(fileURLToPath(import.meta.url));
        while (true) {
            const packageJson = path.join(current, 'package.json');
            if (fs.existsSync(packageJson)) {
                try {
                    const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
                    if (pkg.name === '@aegis/memory') {
                        return current;
                    }
                }
                catch (e) { }
            }
            const parent = path.dirname(current);
            if (parent === current) {
                break;
            }
            current = parent;
        }
        return process.cwd();
    }
    getWorkspaceRoot() {
        return path.dirname(this.getAegisCoreRoot());
    }
    getMemoryModulesDir() {
        const wsRoot = this.getWorkspaceRoot();
        const isCompiled = import.meta.url.includes('/dist/');
        if (isCompiled) {
            return path.resolve(this.getAegisCoreRoot(), 'dist/memory');
        }
        else {
            return path.resolve(wsRoot, 'memory');
        }
    }
    async discoverMemoryModules() {
        const modulesDir = this.getMemoryModulesDir();
        if (!fs.existsSync(modulesDir)) {
            return [];
        }
        const discovered = [];
        const entries = fs.readdirSync(modulesDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory() && entry.name !== 'persistence') {
                discovered.push(entry.name);
            }
        }
        return discovered;
    }
    async loadMemoryModule(moduleName) {
        const modulesDir = this.getMemoryModulesDir();
        const moduleDir = path.resolve(modulesDir, moduleName);
        const isCompiled = import.meta.url.includes('/dist/');
        const entryFileName = isCompiled ? 'index.js' : 'index.ts';
        let indexPath = path.join(moduleDir, entryFileName);
        if (!fs.existsSync(indexPath)) {
            const altFileName = isCompiled ? 'index.ts' : 'index.js';
            indexPath = path.join(moduleDir, altFileName);
        }
        if (!fs.existsSync(indexPath)) {
            throw new Error(`Memory module entry file not found at ${indexPath}`);
        }
        const fileUrl = `${pathToFileURL(indexPath).href}?t=${Date.now()}`;
        const module = await import(fileUrl);
        const manifest = module.default;
        if (!manifest || typeof manifest.initialize !== 'function' || typeof manifest.read !== 'function') {
            throw new Error(`Invalid memory module format in ${indexPath}`);
        }
        const memoryInstance = {
            name: manifest.name || moduleName,
            initialize: manifest.initialize,
            shutdown: manifest.shutdown || (async () => { }),
            read: manifest.read,
            write: manifest.write,
            delete: manifest.delete,
            exists: manifest.exists,
        };
        memoryRegistry.register(moduleName, memoryInstance);
        return memoryInstance;
    }
    async initializeMemoryModule(moduleName) {
        const memory = memoryRegistry.get(moduleName);
        if (!memory) {
            throw new Error(`Memory module ${moduleName} is not loaded.`);
        }
        try {
            const context = runtimeServices.createContext(moduleName);
            await memory.initialize(context);
        }
        catch (err) {
            eventBus.emit('memory.failed', { name: moduleName, error: err.message }, 'memory-system');
            throw err;
        }
    }
}
export const memoryLoader = new MemoryLoader();
