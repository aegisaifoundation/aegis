import { providerManager, providerRegistry, providerLoader } from '@aegis/providers';
import { serviceRegistry, capabilityManager, CapabilityType } from '@aegis/runtime';
import { agent } from './Agent.js';
import { toolRegistry, toolLoader } from '@aegis/tools';
import { skillRegistry, skillLoader } from '@aegis/skills';
import { pluginRegistry, pluginLoader } from '@aegis/plugins';
export class AgentEngine {
    metadata = {
        id: "aegis-agent",
        displayName: "AI Agent Engine",
        version: "1.0.0",
        kernelApiVersion: "1.0.0",
        dependencies: [],
        priority: 10,
        autoStart: true,
        singleton: true,
        permissions: ["*"]
    };
    context;
    async initialize(context) {
        this.context = context;
        context.getLogger().info('AgentEngine: Initializing AI ProviderManager...', 'agent');
        try {
            await providerManager.initialize();
            serviceRegistry.register('providerManager', providerManager);
            serviceRegistry.register('providerRegistry', providerRegistry);
            serviceRegistry.register('providerLoader', providerLoader);
            serviceRegistry.register('agent', agent);
            serviceRegistry.register('toolRegistry', toolRegistry);
            serviceRegistry.register('toolLoader', toolLoader);
            serviceRegistry.register('skillRegistry', skillRegistry);
            serviceRegistry.register('skillLoader', skillLoader);
            serviceRegistry.register('pluginRegistry', pluginRegistry);
            serviceRegistry.register('pluginLoader', pluginLoader);
            context.getLogger().info('AgentEngine: Registered providerManager, agent, registries, and loaders successfully.', 'agent');
        }
        catch (err) {
            context.getLogger().error(`AgentEngine: Failed to initialize/register Agent components: ${err.message}`, 'agent');
            throw err;
        }
        context.getLogger().info('AgentEngine initialized successfully.', 'agent');
    }
    async configure(config) { }
    async start() {
        const config = this.context.getConfig();
        this.context.getLogger().info(`AgentEngine starting. Retrieved config: ${JSON.stringify(config)}`, 'agent');
        // Autoload Tools
        if (Array.isArray(config.autoloadTools)) {
            for (const tool of config.autoloadTools) {
                try {
                    this.context.getLogger().info(`AgentEngine: Autoloading tool ${tool}...`, 'agent');
                    await capabilityManager.add(CapabilityType.TOOL, tool);
                }
                catch (err) {
                    this.context.getLogger().error(`AgentEngine: Failed to autoload tool ${tool}: ${err.message}`, 'agent');
                }
            }
        }
        // Autoload Skills
        if (Array.isArray(config.autoloadSkills)) {
            for (const skill of config.autoloadSkills) {
                try {
                    this.context.getLogger().info(`AgentEngine: Autoloading skill ${skill}...`, 'agent');
                    await capabilityManager.add(CapabilityType.SKILL, skill);
                }
                catch (err) {
                    this.context.getLogger().error(`AgentEngine: Failed to autoload skill ${skill}: ${err.message}`, 'agent');
                }
            }
        }
        // Autoload Plugins
        if (Array.isArray(config.autoloadPlugins)) {
            for (const plugin of config.autoloadPlugins) {
                try {
                    this.context.getLogger().info(`AgentEngine: Autoloading plugin ${plugin}...`, 'agent');
                    await capabilityManager.add(CapabilityType.PLUGIN, plugin);
                }
                catch (err) {
                    this.context.getLogger().error(`AgentEngine: Failed to autoload plugin ${plugin}: ${err.message}`, 'agent');
                }
            }
        }
        // Autoload Providers
        if (Array.isArray(config.autoloadProviders)) {
            for (const provider of config.autoloadProviders) {
                try {
                    this.context.getLogger().info(`AgentEngine: Autoloading provider ${provider}...`, 'agent');
                    await capabilityManager.add(CapabilityType.PROVIDER, provider);
                }
                catch (err) {
                    this.context.getLogger().error(`AgentEngine: Failed to autoload provider ${provider}: ${err.message}`, 'agent');
                }
            }
        }
        this.context.getLogger().info('AgentEngine started successfully.', 'agent');
    }
    async pause() { }
    async resume() { }
    async health() {
        return { status: 'HEALTHY', latencyMs: 0 };
    }
    async reload() { }
    async shutdown() { }
    async dispose() { }
}
