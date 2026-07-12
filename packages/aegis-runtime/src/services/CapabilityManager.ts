import { serviceRegistry } from '../registry/ServiceRegistry.js';
const getToolRegistry = () => serviceRegistry.get<any>('toolRegistry');
const getToolLoader = () => serviceRegistry.get<any>('toolLoader');
const getPluginRegistry = () => serviceRegistry.get<any>('pluginRegistry');
const getPluginLoader = () => serviceRegistry.get<any>('pluginLoader');
const getSkillRegistry = () => serviceRegistry.get<any>('skillRegistry');
const getSkillLoader = () => serviceRegistry.get<any>('skillLoader');
const getProviderLoader = () => serviceRegistry.get<any>('providerLoader');
const getProviderRegistry = () => serviceRegistry.get<any>('providerRegistry');
import { eventBus } from '../eventbus/EventBus.js';




import { configurationManager } from '../config/ConfigurationManager.js';


export enum CapabilityType {
  TOOL = 'tool',
  PLUGIN = 'plugin',
  SKILL = 'skill',
  PROVIDER = 'provider'
}

export class CapabilityManager {
  
  

  async add(type: CapabilityType, capabilityPath: string): Promise<void> {
    eventBus.emit('capability_autoload_started', { type, path: capabilityPath });
    try {
      if (type === CapabilityType.TOOL) {
        const tool = await getToolLoader().loadTool(capabilityPath);
        getToolRegistry().register(tool);
        await configurationManager.updateAutoloadTools('add', capabilityPath);
        eventBus.emit('capability_added', { type, name: tool.name, path: capabilityPath });
        eventBus.emit('capability_initialized', { type, name: tool.name });
      } else if (type === CapabilityType.PLUGIN) {
        const plugin = await getPluginLoader().loadPlugin(capabilityPath);
        await getPluginLoader().initializePlugin(plugin.name);
        await configurationManager.updateAutoloadPlugins('add', capabilityPath);
        eventBus.emit('capability_added', { type, name: plugin.name, path: capabilityPath });
        eventBus.emit('capability_initialized', { type, name: plugin.name });
      } else if (type === CapabilityType.SKILL) {
        const skill = await getSkillLoader().loadSkill(capabilityPath);
        await getSkillLoader().initializeSkill(skill.name);
        await configurationManager.updateAutoloadSkills('add', capabilityPath);
        eventBus.emit('capability_added', { type, name: skill.name, path: capabilityPath });
        eventBus.emit('capability_initialized', { type, name: skill.name });
      } else if (type === CapabilityType.PROVIDER) {
        const providerLoader = getProviderLoader();
        const provider = await getProviderLoader().loadProvider(capabilityPath);
        await getProviderLoader().initializeProvider(capabilityPath);
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
        const tools = getToolRegistry().getAllTools();
        const tool = tools.find((t: any) => t.toolPath === capabilityPath || t.name === capabilityPath || t.name === capabilityPath.split('/').pop());
        if (!tool) {
          throw new Error(`Tool not found in registry: ${capabilityPath}`);
        }
        getToolRegistry().unregister(tool.name);
        const pathToRemove = tool.toolPath || capabilityPath;
        await configurationManager.updateAutoloadTools('remove', pathToRemove);
        eventBus.emit('capability_removed', { type, name: tool.name, path: pathToRemove });
      } else if (type === CapabilityType.PLUGIN) {
        const plugins = getPluginRegistry().list();
        const plugin = plugins.find((p: any) => p.pluginPath === capabilityPath || p.name === capabilityPath || p.name === capabilityPath.split('/').pop());
        if (!plugin) {
          throw new Error(`Plugin not found in registry: ${capabilityPath}`);
        }
        await getPluginLoader().shutdownPlugin(plugin.name);
        const pathToRemove = plugin.pluginPath || capabilityPath;
        await configurationManager.updateAutoloadPlugins('remove', pathToRemove);
        eventBus.emit('capability_removed', { type, name: plugin.name, path: pathToRemove });
      } else if (type === CapabilityType.SKILL) {
        const skills = getSkillRegistry().list();
        const skill = skills.find((s: any) => s.skillPath === capabilityPath || s.name === capabilityPath || s.name === capabilityPath.split('/').pop());
        if (!skill) {
          throw new Error(`Skill not found in registry: ${capabilityPath}`);
        }
        await getSkillLoader().shutdownSkill(skill.name);
        const pathToRemove = skill.skillPath || capabilityPath;
        await configurationManager.updateAutoloadSkills('remove', pathToRemove);
        eventBus.emit('capability_removed', { type, name: skill.name, path: pathToRemove });
      } else if (type === CapabilityType.PROVIDER) {
        const providerRegistry = getProviderRegistry();
        const provider = getProviderRegistry().get(capabilityPath);
        if (!provider) {
          throw new Error(`Provider not found in registry: ${capabilityPath}`);
        }
        await provider.shutdown();
        getProviderRegistry().unregister(capabilityPath);
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
export const ToolLoader = {};
