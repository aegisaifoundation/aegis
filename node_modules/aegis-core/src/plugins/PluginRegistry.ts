import { Plugin } from './Plugin.js';
import { PluginState } from './PluginState.js';
import { eventBus } from '../runtime/EventBus.js';

export class PluginRegistry {
  private plugins: Map<string, Plugin> = new Map();
  private states: Map<string, PluginState> = new Map();

  register(plugin: Plugin): void {
    this.plugins.set(plugin.name, plugin);
    this.states.set(plugin.name, PluginState.DISCOVERED);
    eventBus.emit('plugin_registered', { name: plugin.name, version: plugin.version });
  }

  unregister(name: string): boolean {
    const deleted = this.plugins.delete(name);
    if (deleted) {
      this.states.delete(name);
      eventBus.emit('plugin_unregistered', { name });
    }
    return deleted;
  }

  get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  list(): Plugin[] {
    return Array.from(this.plugins.values());
  }

  setPluginState(name: string, state: PluginState): void {
    this.states.set(name, state);
    eventBus.emit('plugin_state_changed', { name, state });
  }

  getPluginState(name: string): PluginState | undefined {
    return this.states.get(name);
  }
}

export const pluginRegistry = new PluginRegistry();
