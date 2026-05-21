export class PluginLoader {
    plugins = new Map();
    async loadPlugin(plugin) {
        try {
            await plugin.initialize();
            this.plugins.set(plugin.name, plugin);
            console.log(`Plugin loaded successfully: ${plugin.name} v${plugin.version}`);
        }
        catch (e) {
            console.error(`Failed to load plugin ${plugin.name}: ${e.message}`);
        }
    }
    async unloadPlugin(name) {
        const plugin = this.plugins.get(name);
        if (plugin) {
            try {
                await plugin.shutdown();
                this.plugins.delete(name);
                console.log(`Plugin unloaded: ${name}`);
            }
            catch (e) {
                console.error(`Failed to shutdown plugin ${name}: ${e.message}`);
            }
        }
    }
    getLoadedPlugins() {
        return Array.from(this.plugins.values());
    }
}
export const pluginLoader = new PluginLoader();
