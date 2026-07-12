import { providerManager } from '@aegis/providers';
import { serviceRegistry } from '@aegis/runtime';
import { agent } from './Agent.js';
import { toolRegistry } from '@aegis/tools';
import { skillRegistry } from '@aegis/skills';
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
            serviceRegistry.register('agent', agent);
            serviceRegistry.register('toolRegistry', toolRegistry);
            serviceRegistry.register('skillRegistry', skillRegistry);
            context.getLogger().info('AgentEngine: Registered providerManager, agent, toolRegistry, skillRegistry successfully.', 'agent');
        }
        catch (err) {
            context.getLogger().error(`AgentEngine: Failed to initialize/register Agent components: ${err.message}`, 'agent');
            throw err;
        }
        context.getLogger().info('AgentEngine initialized successfully.', 'agent');
    }
    async configure(config) { }
    async start() {
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
