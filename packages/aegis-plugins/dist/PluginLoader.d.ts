import { Plugin } from './Plugin.js';
import { PluginContext } from './PluginContext.js';
export declare class PluginLoader {
    private contexts;
    private getAegisCoreRoot;
    getWorkspaceRoot(): string;
    getPluginsDir(): string;
    loadPlugin(pluginPath: string): Promise<Plugin>;
    createContext(name: string): PluginContext;
    initializePlugin(name: string): Promise<void>;
    shutdownPlugin(name: string): Promise<void>;
}
export declare const pluginLoader: PluginLoader;
