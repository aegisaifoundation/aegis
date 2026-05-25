import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnvironment } from '../utils/environment.js';
import { memoryManager, memoryRegistry, memoryLoader } from '../memory/index.js';
import { providerManager } from '../providers/index.js';
import { terminalTransport } from '../transports/index.js';
import { workspaceManager } from './WorkspaceManager.js';
import { eventBus } from './EventBus.js';
import { CommandLoader, commandRegistry } from '../commands/index.js';
import { configurationManager } from '../config/index.js';
import { capabilityManager, CapabilityType } from './CapabilityManager.js';
import { skillLoader } from '../skills/SkillLoader.js';
import { serviceRegistry } from './ServiceRegistry.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class BootstrapManager {
  async bootstrap(): Promise<void> {
    console.log('[System] Initializing AEGIS Core Runtime Kernel...');

    // Register services in ServiceRegistry
    serviceRegistry.register('eventBus', eventBus);
    serviceRegistry.register('providerManager', providerManager);
    serviceRegistry.register('config', configurationManager);
    serviceRegistry.register('workspaceManager', workspaceManager);
    serviceRegistry.register('memoryRegistry', memoryRegistry);

    // Graceful Shutdown Registration
    eventBus.on('runtime_shutdown_requested', async () => {
      eventBus.emit('runtime_shutdown', { reason: 'requested' });
      console.log('\n[System] Shutdown requested. Cleaning up and exiting...');
      process.exit(0);
    });

    // 1. Load environment variables
    loadEnvironment();

    // 2. Load runtime config & initialize workspace paths
    let autoloadTools: string[] = [];

    try {
      const config = configurationManager.getRuntimeConfig();
      if (Array.isArray(config.autoloadTools)) {
        autoloadTools = config.autoloadTools;
      }
    } catch (e) {
      console.warn('[System] Warning: Failed to read autoloadTools config from runtime.json. Using empty default.', e);
    }

    // Initialize workspace sandbox structure
    workspaceManager.initialize();

    // 3. Initialize session memory persistence
    await memoryManager.init();

    // Autoload memory modules
    console.log('[System] Autoloading memory modules...');
    try {
      const discovered = await memoryLoader.discoverMemoryModules();
      for (const mod of discovered) {
        await memoryLoader.loadMemoryModule(mod);
        await memoryLoader.initializeMemoryModule(mod);
        console.log(`[System] Successfully loaded memory module: ${mod}`);
      }
    } catch (err: any) {
      console.warn('[System] Warning: Failed to autoload memory modules:', err.message);
    }

    // 3.5. Autoload command modules with isolated error boundaries
    console.log('[System] Autoloading command modules...');
    const commandLoader = new CommandLoader();
    let autoloadCommands: string[] = [];
    try {
      const runtimeConfig = configurationManager.getRuntimeConfig();
      if (Array.isArray(runtimeConfig.autoloadCommands)) {
        autoloadCommands = runtimeConfig.autoloadCommands;
      }
    } catch (e) {
      console.warn('[System] Warning: Failed to read autoloadCommands config.', e);
    }

    for (const cmdPath of autoloadCommands) {
      eventBus.emit('command_autoload_started', { commandPath: cmdPath });
      try {
        const command = await commandLoader.loadCommand(cmdPath);
        commandRegistry.register(command);
        console.log(`[System] Successfully autoloaded command: /${command.name} (version ${command.version})`);
      } catch (err: any) {
        eventBus.emit('command_autoload_failed', { commandPath: cmdPath, error: err.message });
        console.error(`[System] Failed to autoload command at '${cmdPath}': ${err.message}`);
      }
    }

    // 4. Autoload runtime plugins with isolated error boundaries
    console.log('[System] Autoloading plugin modules...');
    let autoloadPlugins: string[] = [];
    try {
      const runtimeConfig = configurationManager.getRuntimeConfig();
      if (Array.isArray(runtimeConfig.autoloadPlugins)) {
        autoloadPlugins = runtimeConfig.autoloadPlugins;
      }
    } catch (e) {
      console.warn('[System] Warning: Failed to read autoloadPlugins config. Using empty default.', e);
    }

    for (const pluginPath of autoloadPlugins) {
      try {
        await capabilityManager.add(CapabilityType.PLUGIN, pluginPath);
        console.log(`[System] Successfully autoloaded plugin: ${pluginPath}`);
      } catch (err: any) {
        console.error(`[System] Failed to autoload plugin at '${pluginPath}': ${err.message}`);
      }
    }

    // 4.2. Autoload runtime skills with isolated error boundaries
    console.log('[System] Autoloading skill modules...');
    let autoloadSkills: string[] = [];
    try {
      const runtimeConfig = configurationManager.getRuntimeConfig();
      if (Array.isArray(runtimeConfig.autoloadSkills)) {
        autoloadSkills = runtimeConfig.autoloadSkills;
      }
    } catch (e) {
      console.warn('[System] Warning: Failed to read autoloadSkills config. Using empty default.', e);
    }

    for (const skillPath of autoloadSkills) {
      try {
        const skill = await skillLoader.loadSkill(skillPath);
        await skillLoader.initializeSkill(skill.name);
        console.log(`[System] Successfully autoloaded skill: ${skillPath}`);
      } catch (err: any) {
        console.error(`[System] Failed to autoload skill at '${skillPath}': ${err.message}`);
      }
    }

    // 4.5. Autoload runtime capabilities (tools) with isolated error boundaries
    console.log('[System] Autoloading capability modules...');
    for (const toolPath of autoloadTools) {
      try {
        await capabilityManager.add(CapabilityType.TOOL, toolPath);
        console.log(`[System] Successfully autoloaded tool: ${toolPath}`);
      } catch (err: any) {
        console.error(`[System] Failed to autoload tool at '${toolPath}': ${err.message}`);
      }
    }

    // 4.8. Initialize model providers
    console.log('[System] Initializing model providers...');
    try {
      await providerManager.initialize();
    } catch (err: any) {
      console.error(`[System] Failed to initialize model providers: ${err.message}`);
    }

    // 5. Check model availability in local environment
    const available = await providerManager.checkModelAvailability();
    if (!available) {
      console.warn(
        `\n[System] Warning: Configured model might not be available in active provider '${providerManager.getActiveProviderName()}' right now. Please check provider connection status.\n`
      );
    }

    // 6. Bootstrap transport interface
    await terminalTransport.initialize();

    // Emit runtime_started event
    eventBus.emit('runtime_started', { version: '1.0.0' });
  }

  private getAegisCoreRoot(): string {
    let current = __dirname;
    while (true) {
      const packageJson = path.join(current, 'package.json');
      if (fs.existsSync(packageJson)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
          if (pkg.name === 'aegis-core') {
            return current;
          }
        } catch (e) {
          // ignore parsing issues
        }
      }
      const parent = path.dirname(current);
      if (parent === current) {
        break;
      }
      current = parent;
    }
    return process.cwd();
  }
}

export const bootstrapManager = new BootstrapManager();
