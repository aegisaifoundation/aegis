import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnvironment } from '../utils/environment.js';
import { memoryManager } from '../memory/index.js';
import { modelHandler } from '../models/index.js';
import { terminalTransport } from '../transports/index.js';
import { workspaceManager } from './WorkspaceManager.js';
import { toolRegistry, ToolLoader } from '../tools/index.js';
import { eventBus } from './EventBus.js';
import { CommandLoader, commandRegistry } from '../commands/index.js';
import { configurationManager } from '../config/index.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class BootstrapManager {
  private toolLoader = new ToolLoader();

  async bootstrap(): Promise<void> {
    console.log('[System] Initializing AEGIS Core Runtime Kernel...');

    // Graceful Shutdown Registration
    eventBus.on('runtime_shutdown_requested', async () => {
      console.log('\n[System] Shutdown requested. Cleaning up and exiting...');
      process.exit(0);
    });

    // 1. Load environment variables
    loadEnvironment();

    // 2. Load runtime config & initialize workspace paths
    const coreRoot = this.getAegisCoreRoot();
    const configPath = path.resolve(coreRoot, 'src/config/runtime.json');
    let autoloadTools: string[] = [];

    try {
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (Array.isArray(config.autoloadTools)) {
          autoloadTools = config.autoloadTools;
        }
      }
    } catch (e) {
      console.warn('[System] Warning: Failed to read autoloadTools config from runtime.json. Using empty default.', e);
    }

    // Initialize workspace sandbox structure
    workspaceManager.initialize();

    // 3. Initialize session memory persistence
    await memoryManager.init();

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

    // 4. Autoload runtime capabilities (tools) with isolated error boundaries
    console.log('[System] Autoloading capability modules...');
    for (const toolPath of autoloadTools) {
      eventBus.emit('tool_autoload_started', { toolPath });
      try {
        const tool = await this.toolLoader.loadTool(toolPath);
        toolRegistry.register(tool);
        eventBus.emit('tool_autoload_success', { toolPath, name: tool.name });
        console.log(`[System] Successfully autoloaded tool: ${tool.name} (version ${tool.version})`);
      } catch (err: any) {
        eventBus.emit('tool_autoload_failed', { toolPath, error: err.message });
        console.error(`[System] Failed to autoload tool at '${toolPath}': ${err.message}`);
        // RESILIENCY: We do not rethrow; the runtime kernel degrades gracefully.
      }
    }

    // 5. Check model availability in local environment
    const available = await modelHandler.checkModelAvailability();
    if (!available) {
      console.warn(
        '\n[System] Warning: Configured model might not be available in Ollama right now. Please ensure Ollama is running and the model is pulled.\n'
      );
    }

    // 6. Bootstrap transport interface
    await terminalTransport.initialize();
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
