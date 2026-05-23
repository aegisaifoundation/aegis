import { eventBus } from './EventBus.js';
import { toolRegistry } from '../tools/ToolRegistry.js';
import { ToolLoader } from '../tools/ToolLoader.js';
import { pluginRegistry } from '../plugins/PluginRegistry.js';
import { PluginLoader } from '../plugins/PluginLoader.js';
import { configurationManager } from '../config/ConfigurationManager.js';
import { skillRegistry, skillLoader } from '../skills/index.js';

export enum CapabilityType {
  TOOL = 'tool',
  PLUGIN = 'plugin',
  SKILL = 'skill',
  PROVIDER = 'provider'
}

export class CapabilityManager {
  private toolLoader = new ToolLoader();
  private pluginLoader = new PluginLoader();

  async add(type: CapabilityType, capabilityPath: string): Promise<void> {
    eventBus.emit('capability_autoload_started', { type, path: capabilityPath });
    try {
      if (type === CapabilityType.TOOL) {
        const tool = await this.toolLoader.loadTool(capabilityPath);
        toolRegistry.register(tool);
        await configurationManager.updateAutoloadTools('add', capabilityPath);
        eventBus.emit('capability_added', { type, name: tool.name, path: capabilityPath });
        eventBus.emit('capability_initialized', { type, name: tool.name });
      } else if (type === CapabilityType.PLUGIN) {
        const plugin = await this.pluginLoader.loadPlugin(capabilityPath);
        await this.pluginLoader.initializePlugin(plugin.name);
        await configurationManager.updateAutoloadPlugins('add', capabilityPath);
        eventBus.emit('capability_added', { type, name: plugin.name, path: capabilityPath });
        eventBus.emit('capability_initialized', { type, name: plugin.name });
      } else if (type === CapabilityType.SKILL) {
        const skill = await skillLoader.loadSkill(capabilityPath);
        await skillLoader.initializeSkill(skill.name);
        await configurationManager.updateAutoloadSkills('add', capabilityPath);
        eventBus.emit('capability_added', { type, name: skill.name, path: capabilityPath });
        eventBus.emit('capability_initialized', { type, name: skill.name });
      } else if (type === CapabilityType.PROVIDER) {
        const { providerLoader } = await import('../providers/index.js');
        const provider = await providerLoader.loadProvider(capabilityPath);
        await providerLoader.initializeProvider(capabilityPath);
        await configurationManager.updateAutoloadProviders('add', capabilityPath);
        eventBus.emit('capability_added', { type, name: provider.name, path: capabilityPath });
        eventBus.emit('capability_initialized', { type, name: provider.name });
      } else {
        throw new Error(`Unsupported capability type: ${type}`);
      }
    } catch (err: any) {
      eventBus.emit('capability_failed', { type, path: capabilityPath, error: err.message });
      throw err;
    }
  }

  async remove(type: CapabilityType, capabilityPath: string): Promise<void> {
    try {
      if (type === CapabilityType.TOOL) {
        const tools = toolRegistry.getAllTools();
        const tool = tools.find(t => t.toolPath === capabilityPath || t.name === capabilityPath || t.name === capabilityPath.split('/').pop());
        if (!tool) {
          throw new Error(`Tool not found in registry: ${capabilityPath}`);
        }
        toolRegistry.unregister(tool.name);
        const pathToRemove = tool.toolPath || capabilityPath;
        await configurationManager.updateAutoloadTools('remove', pathToRemove);
        eventBus.emit('capability_removed', { type, name: tool.name, path: pathToRemove });
      } else if (type === CapabilityType.PLUGIN) {
        const plugins = pluginRegistry.list();
        const plugin = plugins.find(p => p.pluginPath === capabilityPath || p.name === capabilityPath || p.name === capabilityPath.split('/').pop());
        if (!plugin) {
          throw new Error(`Plugin not found in registry: ${capabilityPath}`);
        }
        await this.pluginLoader.shutdownPlugin(plugin.name);
        const pathToRemove = plugin.pluginPath || capabilityPath;
        await configurationManager.updateAutoloadPlugins('remove', pathToRemove);
        eventBus.emit('capability_removed', { type, name: plugin.name, path: pathToRemove });
      } else if (type === CapabilityType.SKILL) {
        const skills = skillRegistry.list();
        const skill = skills.find(s => s.skillPath === capabilityPath || s.name === capabilityPath || s.name === capabilityPath.split('/').pop());
        if (!skill) {
          throw new Error(`Skill not found in registry: ${capabilityPath}`);
        }
        await skillLoader.shutdownSkill(skill.name);
        const pathToRemove = skill.skillPath || capabilityPath;
        await configurationManager.updateAutoloadSkills('remove', pathToRemove);
        eventBus.emit('capability_removed', { type, name: skill.name, path: pathToRemove });
      } else if (type === CapabilityType.PROVIDER) {
        const { providerRegistry } = await import('../providers/index.js');
        const provider = providerRegistry.get(capabilityPath);
        if (!provider) {
          throw new Error(`Provider not found in registry: ${capabilityPath}`);
        }
        await provider.shutdown();
        providerRegistry.unregister(capabilityPath);
        await configurationManager.updateAutoloadProviders('remove', capabilityPath);
        eventBus.emit('capability_removed', { type, name: provider.name, path: capabilityPath });
      } else {
        throw new Error(`Unsupported capability type: ${type}`);
      }
    } catch (err: any) {
      eventBus.emit('capability_failed', { type, path: capabilityPath, error: err.message });
      throw err;
    }
  }

  async update(type: CapabilityType, capabilityPath: string): Promise<void> {
    try {
      // Gracefully unload existing capability if registered, before reloading
      try {
        await this.remove(type, capabilityPath);
      } catch (e) {
        // Safe to ignore if it wasn't registered/loaded
      }
      
      // Load/Re-register capability
      await this.add(type, capabilityPath);
      eventBus.emit('capability_updated', { type, path: capabilityPath });
    } catch (err: any) {
      eventBus.emit('capability_failed', { type, path: capabilityPath, error: err.message });
      throw err;
    }
  }
}

export const capabilityManager = new CapabilityManager();
export { ToolLoader } from '../tools/ToolLoader.js';
