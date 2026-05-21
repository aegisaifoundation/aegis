import { Plugin } from './Plugin.js';

export class PluginLoader {
  private plugins: Map<string, Plugin> = new Map();

  async loadPlugin(plugin: Plugin): Promise<void> {
    try {
      await plugin.initialize();
      this.plugins.set(plugin.name, plugin);
      console.log(`Plugin loaded successfully: ${plugin.name} v${plugin.version}`);
    } catch (e: any) {
      console.error(`Failed to load plugin ${plugin.name}: ${e.message}`);
    }
  }

  async unloadPlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (plugin) {
      try {
        await plugin.shutdown();
        this.plugins.delete(name);
        console.log(`Plugin unloaded: ${name}`);
      } catch (e: any) {
        console.error(`Failed to shutdown plugin ${name}: ${e.message}`);
      }
    }
  }

  getLoadedPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }
}

export const pluginLoader = new PluginLoader();
