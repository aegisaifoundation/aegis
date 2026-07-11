import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { pluginRegistry } from './PluginRegistry.js';
import { PluginState } from './PluginState.js';
import { pluginPermissionManager } from './PluginPermissionManager.js';
import { eventBus, configurationManager, workspaceManager, serviceRegistry } from '@aegis/runtime';
import { toolRegistry } from '@aegis/tools';
import { providerManager } from '@aegis/providers';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Cache the plugins root path — computed once, reused on every plugin load
let _cachedPluginRoot = null;
export class PluginLoader {
    contexts = new Map();
    getAegisCoreRoot() {
        if (_cachedPluginRoot !== null)
            return _cachedPluginRoot;
        let current = __dirname;
        while (true) {
            const packageJson = path.join(current, 'package.json');
            if (fs.existsSync(packageJson) && !current.includes('node_modules')) {
                try {
                    const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
                    if (pkg.name === '@aegis/plugins') {
                        _cachedPluginRoot = current;
                        return current;
                    }
                }
                catch (e) {
                    // ignore
                }
            }
            const parent = path.dirname(current);
            if (parent === current) {
                break;
            }
            current = parent;
        }
        let cwd = process.cwd();
        const nmIndex = cwd.indexOf('node_modules');
        if (nmIndex !== -1) {
            cwd = cwd.substring(0, nmIndex);
        }
        if (fs.existsSync(path.resolve(cwd, 'aegis/plugins/package.json'))) {
            _cachedPluginRoot = path.resolve(cwd, '@aegis/plugins');
        }
        else {
            _cachedPluginRoot = cwd;
        }
        return _cachedPluginRoot;
    }
    getWorkspaceRoot() {
        return path.dirname(this.getAegisCoreRoot());
    }
    getPluginsDir() {
        const wsRoot = this.getWorkspaceRoot();
        return path.resolve(wsRoot, 'plugins');
    }
    async loadPlugin(pluginPath) {
        const pluginsDir = this.getPluginsDir();
        const pluginDir = path.resolve(pluginsDir, pluginPath);
        if (!fs.existsSync(pluginDir)) {
            throw new Error(`Plugin directory not found: ${pluginDir}`);
        }
        const metadataPath = path.join(pluginDir, 'plugin.json');
        if (!fs.existsSync(metadataPath)) {
            throw new Error(`plugin.json not found in ${pluginDir}`);
        }
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        let permissions = [];
        const permissionsPath = path.join(pluginDir, 'permissions.json');
        if (fs.existsSync(permissionsPath)) {
            const permsData = JSON.parse(fs.readFileSync(permissionsPath, 'utf8'));
            if (Array.isArray(permsData.permissions)) {
                permissions = permsData.permissions;
            }
        }
        if (!pluginPermissionManager.validate(permissions)) {
            throw new Error(`Permission validation failed for plugin ${metadata.name}`);
        }
        const isCompiled = import.meta.url.includes('/dist/');
        const entryFile = metadata.entry || 'index.ts';
        let entryName = entryFile;
        if (isCompiled && entryFile.endsWith('.ts')) {
            entryName = entryFile.replace(/\.ts$/, '.js');
        }
        else if (!isCompiled && entryFile.endsWith('.js')) {
            entryName = entryFile.replace(/\.js$/, '.ts');
        }
        let indexPath = path.join(pluginDir, entryName);
        if (!fs.existsSync(indexPath)) {
            const fallbackName = entryName.endsWith('.ts') ? entryName.replace(/\.ts$/, '.js') : entryName.replace(/\.js$/, '.ts');
            const fallbackPath = path.join(pluginDir, fallbackName);
            if (fs.existsSync(fallbackPath)) {
                indexPath = fallbackPath;
            }
        }
        if (!fs.existsSync(indexPath)) {
            throw new Error(`Entry file (index.ts/index.js) not found in ${pluginDir}`);
        }
        const fileUrl = `${pathToFileURL(indexPath).href}?t=${Date.now()}`;
        const module = await import(fileUrl);
        const manifest = module.default;
        if (!metadata || typeof metadata !== 'object') {
            throw new Error('Invalid metadata format in plugin.json');
        }
        if (!metadata.name || typeof metadata.name !== 'string' || metadata.name.trim() === '') {
            throw new Error('Plugin metadata is missing a valid "name" field.');
        }
        if (!manifest) {
            throw new Error(`Plugin package at ${indexPath} does not export default manifest.`);
        }
        if (manifest.name !== metadata.name) {
            throw new Error(`Plugin name mismatch: manifest has '${manifest.name}' but plugin.json has '${metadata.name}'`);
        }
        if (typeof manifest.initialize !== 'function') {
            throw new Error(`Plugin package at ${indexPath} does not export a default initialize function.`);
        }
        if (typeof manifest.shutdown !== 'function') {
            throw new Error(`Plugin package at ${indexPath} does not export a default shutdown function.`);
        }
        const plugin = {
            name: manifest.name,
            description: manifest.description || metadata.description || '',
            category: metadata.category || 'shared',
            version: metadata.version || '1.0.0',
            permissions,
            entryPath: indexPath,
            pluginPath,
            initialize: manifest.initialize,
            shutdown: manifest.shutdown,
            ...manifest
        };
        pluginRegistry.register(plugin);
        return plugin;
    }
    createContext(name) {
        const logger = {
            info: (message, context) => eventBus.emit('log', { level: 'INFO', message, context }),
            debug: (message, context) => eventBus.emit('log', { level: 'DEBUG', message, context }),
            warn: (message, context) => eventBus.emit('log', { level: 'WARN', message, context }),
            error: (message, context) => eventBus.emit('log', { level: 'ERROR', message, context }),
        };
        return {
            services: {
                getEventBus: () => eventBus,
                getConfigurationManager: () => configurationManager,
                getToolRegistry: () => toolRegistry,
                getCommandRegistry: () => serviceRegistry.get('commandRegistry'),
                getModelProvider: () => providerManager,
                getWorkspacePath: () => workspaceManager.getWorkspacePath(),
                getPluginRegistry: () => pluginRegistry,
                getLogger: () => logger
            },
            config: configurationManager.getRuntimeConfig().plugins?.[name] || {}
        };
    }
    async initializePlugin(name) {
        const plugin = pluginRegistry.get(name);
        if (!plugin) {
            throw new Error(`Plugin ${name} not found in registry.`);
        }
        pluginRegistry.setPluginState(name, PluginState.INITIALIZING);
        try {
            const context = this.createContext(name);
            this.contexts.set(name, context);
            await plugin.initialize(context);
            pluginRegistry.setPluginState(name, PluginState.ACTIVE);
            eventBus.emit('plugin_loaded', { name, version: plugin.version });
        }
        catch (err) {
            this.contexts.delete(name);
            pluginRegistry.setPluginState(name, PluginState.FAILED);
            eventBus.emit('plugin_failed', { name, error: err.message });
            console.error(`[PluginSystem] Failed to initialize plugin ${name}: ${err.message}`);
        }
    }
    async shutdownPlugin(name) {
        const plugin = pluginRegistry.get(name);
        if (!plugin) {
            return;
        }
        try {
            const context = this.contexts.get(name) || this.createContext(name);
            await plugin.shutdown(context);
            pluginRegistry.setPluginState(name, PluginState.UNLOADED);
            pluginRegistry.unregister(name);
            this.contexts.delete(name);
        }
        catch (err) {
            pluginRegistry.setPluginState(name, PluginState.FAILED);
            eventBus.emit('plugin_failed', { name, error: `Shutdown error: ${err.message}` });
            console.error(`[PluginSystem] Failed to shutdown plugin ${name}: ${err.message}`);
        }
    }
}
