import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';

export class ApiEngine implements IEngine {
  readonly metadata: IEngineMetadata = {
    id: "aegis-api",
    displayName: "REST API Connector Engine",
    version: "1.0.0",
    kernelApiVersion: "1.0.0",
    dependencies: [],
    priority: 20,
    autoStart: true,
    singleton: true,
    permissions: ["net:listen", "fs:read"]
  };

  private context!: IRuntimeContext_v1;
  private serverActive = false;

  private getRepositoryRoot(startDir: string): string {
    let current = path.resolve(startDir);
    const seen = new Set<string>();
    while (true) {
      const packageJson = path.join(current, 'package.json');
      if (fs.existsSync(packageJson)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
          if (pkg.name === 'aegis-monorepo') {
            return current;
          }
        } catch (e) {}
      }
      const parent = path.dirname(current);
      if (parent === current || seen.has(parent)) {
        break;
      }
      seen.add(current);
      current = parent;
    }
    return process.cwd();
  }

  async initialize(context: IRuntimeContext_v1): Promise<void> {
    this.context = context;
    context.getLogger().info('ApiEngine initialized successfully.', 'api');
  }

  async configure(config: Record<string, any>): Promise<void> {}
  
  async start(): Promise<void> {
    this.context.getLogger().info('Starting REST API Server...', 'api');
    try {
      const { startApiServer } = await import('./ApiServer.js');
      await startApiServer();
      
      this.serverActive = true;
      this.context.getLogger().info('[ApiEngine] REST API Server successfully started.', 'api');
    } catch (err: any) {
      this.context.getLogger().error(`[ApiEngine] Failed to start REST API Server: ${err.message}`, 'api');
      throw err;
    }
  }
  
  async pause(): Promise<void> {}
  
  async resume(): Promise<void> {}
  
  async health(): Promise<EngineHealthReport> {
    return { 
      status: this.serverActive ? 'HEALTHY' : 'DEGRADED', 
      latencyMs: 0 
    };
  }
  
  async reload(): Promise<void> {}
  
  async shutdown(): Promise<void> {
    this.context.getLogger().info('[ApiEngine] Shutting down REST API Server.', 'api');
  }
  
  async dispose(): Promise<void> {}
}
