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
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class BootstrapManager {
    toolLoader = new ToolLoader();
    async bootstrap() {
        console.log('[System] Initializing AEGIS Core Runtime Kernel...');
        // 1. Load environment variables
        loadEnvironment();
        // 2. Load runtime config & initialize workspace paths
        const coreRoot = this.getAegisCoreRoot();
        const configPath = path.resolve(coreRoot, 'src/config/runtime.json');
        let autoloadTools = [];
        try {
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (Array.isArray(config.autoloadTools)) {
                    autoloadTools = config.autoloadTools;
                }
            }
        }
        catch (e) {
            console.warn('[System] Warning: Failed to read autoloadTools config from runtime.json. Using empty default.', e);
        }
        // Initialize workspace sandbox structure
        workspaceManager.initialize();
        // 3. Initialize session memory persistence
        await memoryManager.init();
        // 4. Autoload runtime capabilities (tools) with isolated error boundaries
        console.log('[System] Autoloading capability modules...');
        for (const toolPath of autoloadTools) {
            eventBus.emit('tool_autoload_started', { toolPath });
            try {
                const tool = await this.toolLoader.loadTool(toolPath);
                toolRegistry.register(tool);
                eventBus.emit('tool_autoload_success', { toolPath, name: tool.name });
                console.log(`[System] Successfully autoloaded tool: ${tool.name} (version ${tool.version})`);
            }
            catch (err) {
                eventBus.emit('tool_autoload_failed', { toolPath, error: err.message });
                console.error(`[System] Failed to autoload tool at '${toolPath}': ${err.message}`);
                // RESILIENCY: We do not rethrow; the runtime kernel degrades gracefully.
            }
        }
        // 5. Check model availability in local environment
        const available = await modelHandler.checkModelAvailability();
        if (!available) {
            console.warn('\n[System] Warning: Configured model might not be available in Ollama right now. Please ensure Ollama is running and the model is pulled.\n');
        }
        // 6. Bootstrap transport interface
        await terminalTransport.initialize();
    }
    getAegisCoreRoot() {
        let current = __dirname;
        while (true) {
            const packageJson = path.join(current, 'package.json');
            if (fs.existsSync(packageJson)) {
                try {
                    const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
                    if (pkg.name === 'aegis-core') {
                        return current;
                    }
                }
                catch (e) {
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
