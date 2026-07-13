import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';
import { providerManager, providerRegistry, providerLoader } from '@aegis/providers';
import { serviceRegistry } from '@aegis/runtime';
import { agent } from './Agent.js';
import { toolRegistry, toolLoader } from '@aegis/tools';
import { skillRegistry, skillLoader } from '@aegis/skills';
import { pluginRegistry, pluginLoader } from '@aegis/plugins';

export class AgentEngine implements IEngine {
  readonly metadata: IEngineMetadata = {
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

  private context!: IRuntimeContext_v1;

  async initialize(context: IRuntimeContext_v1): Promise<void> {
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
    } catch (err: any) {
      context.getLogger().error(`AgentEngine: Failed to initialize/register Agent components: ${err.message}`, 'agent');
      throw err;
    }
    context.getLogger().info('AgentEngine initialized successfully.', 'agent');
  }

  async configure(config: Record<string, any>): Promise<void> {}
  
  async start(): Promise<void> {
    this.context.getLogger().info('AgentEngine started successfully.', 'agent');
  }
  
  async pause(): Promise<void> {}
  
  async resume(): Promise<void> {}
  
  async health(): Promise<EngineHealthReport> {
    return { status: 'HEALTHY', latencyMs: 0 };
  }
  
  async reload(): Promise<void> {}
  
  async shutdown(): Promise<void> {}
  
  async dispose(): Promise<void> {}
}
