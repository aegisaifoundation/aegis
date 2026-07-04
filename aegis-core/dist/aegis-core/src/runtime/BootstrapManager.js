import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnvironment } from '../utils/environment.js';
import { memoryManager, memoryRegistry, memoryLoader, memoryEventBus, AuditLogger, memoryEmbeddingManager, memorySearchManager, EmbeddingHandler, memoryReflectionManager, ReflectionHandler, memoryRankingManager, memoryCompressionManager, memoryConflictResolver } from '../memory/index.js';
import { providerManager } from '../providers/index.js';
import { terminalTransport } from '../transports/index.js';
import { workspaceManager } from './WorkspaceManager.js';
import { eventBus } from './EventBus.js';
import { CommandLoader, commandRegistry } from '../commands/index.js';
import { configurationManager } from '../config/index.js';
import { capabilityManager, CapabilityType } from './CapabilityManager.js';
import { skillLoader } from '../skills/SkillLoader.js';
import { serviceRegistry } from './ServiceRegistry.js';
import { runtimeSessionManager } from './RuntimeSessionManager.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class BootstrapManager {
    async bootstrap() {
        console.log('[System] Initializing AEGIS Core Runtime Kernel...');
        // Register services in ServiceRegistry
        serviceRegistry.register('eventBus', eventBus);
        serviceRegistry.register('providerManager', providerManager);
        serviceRegistry.register('config', configurationManager);
        serviceRegistry.register('workspaceManager', workspaceManager);
        serviceRegistry.register('memoryRegistry', memoryRegistry);
        serviceRegistry.register('memoryEventBus', memoryEventBus);
        serviceRegistry.register('memoryEmbeddingManager', memoryEmbeddingManager);
        serviceRegistry.register('memorySearchManager', memorySearchManager);
        serviceRegistry.register('memoryReflectionManager', memoryReflectionManager);
        serviceRegistry.register('memoryRankingManager', memoryRankingManager);
        serviceRegistry.register('memoryCompressionManager', memoryCompressionManager);
        serviceRegistry.register('memoryConflictResolver', memoryConflictResolver);
        // Subscribe handlers to memory events asynchronously
        memoryEventBus.subscribe('*', async (event) => {
            await AuditLogger.handleEvent(event);
        });
        memoryEventBus.subscribe('workingMemory.updated', async (event) => {
            await EmbeddingHandler.handleEvent(event);
        });
        memoryEventBus.subscribe('sessionMemory.updated', async (event) => {
            await EmbeddingHandler.handleEvent(event);
        });
        memoryEventBus.subscribe('session.archived', async (event) => {
            await ReflectionHandler.handleEvent(event);
        });
        // Graceful Shutdown Registration
        eventBus.on('runtime_shutdown_requested', async () => {
            console.log('\n[System] Shutdown requested. Cleaning up and exiting...');
            try {
                await runtimeSessionManager.shutdown();
            }
            catch (err) {
                console.error('[System] Error during session manager shutdown:', err.message || err);
            }
            eventBus.emit('runtime_shutdown', { reason: 'requested' });
            process.exit(0);
        });
        // 1. Load environment variables
        loadEnvironment();
        // 2. Load runtime config ONCE and extract all autoload lists
        let autoloadTools = [];
        let autoloadCommands = [];
        let autoloadPlugins = [];
        let autoloadSkills = [];
        try {
            const runtimeConfig = configurationManager.getRuntimeConfig();
            if (Array.isArray(runtimeConfig.autoloadTools))
                autoloadTools = runtimeConfig.autoloadTools;
            if (Array.isArray(runtimeConfig.autoloadCommands))
                autoloadCommands = runtimeConfig.autoloadCommands;
            if (Array.isArray(runtimeConfig.autoloadPlugins))
                autoloadPlugins = runtimeConfig.autoloadPlugins;
            if (Array.isArray(runtimeConfig.autoloadSkills))
                autoloadSkills = runtimeConfig.autoloadSkills;
        }
        catch (e) {
            console.warn('[System] Warning: Failed to read autoload config from runtime.json. Using empty defaults.', e);
        }
        // Initialize workspace sandbox structure (synchronous, fast)
        workspaceManager.initialize();
        // 3. Sequential prerequisites: memory init THEN session manager init
        await memoryManager.init();
        await runtimeSessionManager.initialize();
        serviceRegistry.register('runtimeSessionManager', runtimeSessionManager);
        // 4. Parallelize all independent loading phases
        console.log('[System] Autoloading modules in parallel...');
        const memoryLoadTask = (async () => {
            try {
                const discovered = await memoryLoader.discoverMemoryModules();
                for (const mod of discovered) {
                    await memoryLoader.loadMemoryModule(mod);
                    await memoryLoader.initializeMemoryModule(mod);
                }
            }
            catch (err) {
                console.warn('[System] Warning: Failed to autoload memory modules:', err.message);
            }
        })();
        const commandLoadTask = (async () => {
            const commandLoader = new CommandLoader();
            const results = await Promise.allSettled(autoloadCommands.map(async (cmdPath) => {
                eventBus.emit('command_autoload_started', { commandPath: cmdPath });
                const command = await commandLoader.loadCommand(cmdPath);
                commandRegistry.register(command);
                return command.name;
            }));
            for (const result of results) {
                if (result.status === 'rejected') {
                    console.error(`[System] Failed to autoload command: ${result.reason?.message || result.reason}`);
                }
            }
        })();
        const pluginLoadTask = (async () => {
            const results = await Promise.allSettled(autoloadPlugins.map((pluginPath) => capabilityManager.add(CapabilityType.PLUGIN, pluginPath)));
            for (const result of results) {
                if (result.status === 'rejected') {
                    console.error(`[System] Failed to autoload plugin: ${result.reason?.message || result.reason}`);
                }
            }
        })();
        const skillLoadTask = (async () => {
            const results = await Promise.allSettled(autoloadSkills.map(async (skillPath) => {
                const skill = await skillLoader.loadSkill(skillPath);
                await skillLoader.initializeSkill(skill.name);
            }));
            for (const result of results) {
                if (result.status === 'rejected') {
                    console.error(`[System] Failed to autoload skill: ${result.reason?.message || result.reason}`);
                }
            }
        })();
        const toolLoadTask = (async () => {
            const results = await Promise.allSettled(autoloadTools.map((toolPath) => capabilityManager.add(CapabilityType.TOOL, toolPath)));
            for (const result of results) {
                if (result.status === 'rejected') {
                    console.error(`[System] Failed to autoload tool: ${result.reason?.message || result.reason}`);
                }
            }
        })();
        // Wait for all parallel loading phases
        await Promise.allSettled([
            memoryLoadTask,
            commandLoadTask,
            pluginLoadTask,
            skillLoadTask,
            toolLoadTask
        ]);
        console.log('[System] All modules loaded.');
        // 5. Initialize model providers + check availability in parallel
        try {
            await providerManager.initialize();
        }
        catch (err) {
            console.error(`[System] Failed to initialize model providers: ${err.message}`);
        }
        // 5.5. Check model availability + initialize transport in parallel
        const [available] = await Promise.allSettled([
            providerManager.checkModelAvailability(),
            terminalTransport.initialize()
        ]);
        if (available.status === 'fulfilled' && !available.value) {
            console.warn(`\n[System] Warning: Configured model might not be available in active provider '${providerManager.getActiveProviderName()}' right now. Please check provider connection status.\n`);
        }
        // Emit runtime_started event
        eventBus.emit('runtime_started', { version: '1.0.0' });
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
