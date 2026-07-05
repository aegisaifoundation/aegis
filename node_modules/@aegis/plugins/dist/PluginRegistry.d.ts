import { Plugin } from './Plugin.js';
import { PluginState } from './PluginState.js';
export declare class PluginRegistry {
    private plugins;
    private states;
    register(plugin: Plugin): void;
    unregister(name: string): boolean;
    get(name: string): Plugin | undefined;
    list(): Plugin[];
    setPluginState(name: string, state: PluginState): void;
    getPluginState(name: string): PluginState | undefined;
}
export declare const pluginRegistry: PluginRegistry;
