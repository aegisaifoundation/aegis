import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';

export class DummyEngine implements IEngine {
  readonly metadata: IEngineMetadata = {
    id: "dummy-engine",
    displayName: "Dummy Test Engine",
    version: "1.0.0",
    kernelApiVersion: "1.0.0",
    dependencies: [],
    priority: 99,
    autoStart: true,
    singleton: true,
    permissions: []
  };

  private context!: IRuntimeContext_v1;

  async initialize(context: IRuntimeContext_v1): Promise<void> {
    this.context = context;
    context.getLogger().info('DummyEngine initialized successfully.', 'dummy');
  }

  async configure(config: Record<string, any>): Promise<void> {}
  
  async start(): Promise<void> {
    this.context.getLogger().info('DummyEngine started successfully.', 'dummy');
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
