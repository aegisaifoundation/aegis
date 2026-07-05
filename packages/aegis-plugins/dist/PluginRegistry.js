import { PluginState } from './PluginState.js';
import { eventBus } from '@aegis/runtime';
export class PluginRegistry {
    plugins = new Map();
    states = new Map();
    register(plugin) {
        this.plugins.set(plugin.name, plugin);
        this.states.set(plugin.name, PluginState.DISCOVERED);
        eventBus.emit('plugin_registered', { name: plugin.name, version: plugin.version });
    }
    unregister(name) {
        const deleted = this.plugins.delete(name);
        if (deleted) {
            this.states.delete(name);
            eventBus.emit('plugin_unregistered', { name });
        }
        return deleted;
    }
    get(name) {
        return this.plugins.get(name);
    }
    list() {
        return Array.from(this.plugins.values());
    }
    setPluginState(name, state) {
        this.states.set(name, state);
        eventBus.emit('plugin_state_changed', { name, state });
    }
    getPluginState(name) {
        return this.states.get(name);
    }
}
export const pluginRegistry = new PluginRegistry();
