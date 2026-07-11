import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';
import { checkpointManager, serviceRegistry, ICheckpointable } from '@aegis/runtime';
import path from 'path';
import { existsSync } from 'fs';
import fs from 'fs/promises';

import { memoryManager } from './MemoryManager.js';
import { memoryGateway } from './MemoryGateway.js';
import { MemoryIndexManager } from './indexing/MemoryIndexManager.js';
import { memoryTransactionManager } from './transactions/MemoryTransactionManager.js';
import { projectionGenerator } from './ProjectionGenerator.js';
import { memoryWriteBuffer } from './MemoryWriteBuffer.js';
import { MemoryObservability } from './utils/MemoryObservability.js';
import { projectionConsistencyValidator } from './ProjectionConsistencyValidator.js';
import { memoryRegistry } from './MemoryRegistry.js';
import { memoryEventBus } from './eventbus/MemoryEventBus.js';
import { memoryEmbeddingManager } from './embedding/MemoryEmbeddingManager.js';
import { memorySearchManager } from './search/MemorySearchManager.js';
import { memoryReflectionManager } from './refinement/MemoryReflectionManager.js';
import { memoryRankingManager } from './refinement/MemoryRankingManager.js';
import { memoryCompressionManager } from './refinement/MemoryCompressionManager.js';
import { memoryConflictResolver } from './refinement/MemoryConflictResolver.js';

export class MemoryEngine implements IEngine, ICheckpointable {
  readonly metadata: IEngineMetadata = {
    id: "aegis-memory",
    displayName: "Cognitive Memory Engine",
    version: "1.0.0",
    kernelApiVersion: "1.0.0",
    dependencies: [],
    priority: 5,
    autoStart: true,
    singleton: true,
    permissions: ["*"]
  };

  private context!: IRuntimeContext_v1;

  async initialize(context: IRuntimeContext_v1): Promise<void> {
    this.context = context;
    checkpointManager.register(this);
    
    // Register memory engine services in ServiceRegistry
    serviceRegistry.register('memoryManager', memoryManager);
    serviceRegistry.register('memoryGateway', memoryGateway);
    serviceRegistry.register('MemoryIndexManager', MemoryIndexManager);
    serviceRegistry.register('memoryTransactionManager', memoryTransactionManager);
    serviceRegistry.register('projectionGenerator', projectionGenerator);
    serviceRegistry.register('memoryWriteBuffer', memoryWriteBuffer);
    serviceRegistry.register('MemoryObservability', MemoryObservability);
    serviceRegistry.register('projectionConsistencyValidator', projectionConsistencyValidator);
    serviceRegistry.register('memoryRegistry', memoryRegistry);
    serviceRegistry.register('memoryEventBus', memoryEventBus);
    serviceRegistry.register('memoryEmbeddingManager', memoryEmbeddingManager);
    serviceRegistry.register('memorySearchManager', memorySearchManager);
    serviceRegistry.register('memoryReflectionManager', memoryReflectionManager);
    serviceRegistry.register('memoryRankingManager', memoryRankingManager);
    serviceRegistry.register('memoryCompressionManager', memoryCompressionManager);
    serviceRegistry.register('memoryConflictResolver', memoryConflictResolver);
    
    context.getLogger().info('MemoryEngine initialized successfully.', 'memory');
  }

  async configure(config: Record<string, any>): Promise<void> {}
  
  async start(): Promise<void> {
    this.context.getLogger().info('MemoryEngine started successfully.', 'memory');
  }
  
  async pause(): Promise<void> {}
  
  async resume(): Promise<void> {}
  
  async health(): Promise<EngineHealthReport> {
    return { status: 'HEALTHY', latencyMs: 0 };
  }
  
  async reload(): Promise<void> {}
  
  async shutdown(): Promise<void> {
    checkpointManager.unregister(this);
  }
  
  async dispose(): Promise<void> {}

  public async createCheckpoint(name: string, sessionId?: string): Promise<void> {
    if (!sessionId) return;
    const wsRoot = path.dirname(this.context.getWorkspacePath());
    const cpDir = path.resolve(wsRoot, 'runtime/checkpoints');
    if (!existsSync(cpDir)) {
      await fs.mkdir(cpDir, { recursive: true });
    }

    const { memoryGateway } = await import('./MemoryGateway.js');
    let sessionState = null;
    try {
      sessionState = await memoryGateway.getSessionState(sessionId);
    } catch (err) {
      this.context.getLogger().warn(`[MemoryEngine] Could not load session state for checkpoint: ${err}`);
    }

    if (sessionState) {
      const sessionCpPath = path.join(cpDir, `${name}_session_${sessionId}.json`);
      const { safeJsonWrite } = await import('./utils/MemoryFileHelpers.js');
      await safeJsonWrite(sessionCpPath, sessionState);
    }
  }

  public async rollbackToCheckpoint(name: string, sessionId?: string): Promise<void> {
    if (!sessionId) return;
    const wsRoot = path.dirname(this.context.getWorkspacePath());
    const sessionCpPath = path.resolve(wsRoot, `runtime/checkpoints/${name}_session_${sessionId}.json`);

    if (existsSync(sessionCpPath)) {
      const { safeJsonRead } = await import('./utils/MemoryFileHelpers.js');
      const sessionState = await safeJsonRead<any>(sessionCpPath, null);
      if (!sessionState) {
        throw new Error(`Checkpoint session-state for "${name}" is empty or corrupted`);
      }
      sessionState.checkpointVersion = (sessionState.checkpointVersion || 0) + 1;

      const { memoryGateway } = await import('./MemoryGateway.js');
      await memoryGateway.updateSessionState(sessionId, sessionState);

      const { projectionGenerator } = await import('./ProjectionGenerator.js');
      await projectionGenerator.projectSessionState(sessionId, sessionState);
    }
  }
}
