import { MemoryIndexManager } from '../memory/indexing/MemoryIndexManager.js';
import { SessionMetadata } from '../memory/interfaces/MemoryTypes.js';

export class RuntimeSessionRegistry {
  private static instance = new RuntimeSessionRegistry();

  public static getInstance(): RuntimeSessionRegistry {
    return this.instance;
  }

  /**
   * Retrieves the indexed summary of sessions.
   */
  public async listSessions(): Promise<any[]> {
    return await MemoryIndexManager.listSessions();
  }

  /**
   * Delegates session registration directly to the MemoryIndexManager.
   */
  public async registerSession(metadata: SessionMetadata): Promise<void> {
    await MemoryIndexManager.registerSession(metadata);
  }

  /**
   * Delegates session unregistration directly to the MemoryIndexManager.
   */
  public async unregisterSession(sessionId: string): Promise<void> {
    await MemoryIndexManager.unregisterSession(sessionId);
  }
}

export const runtimeSessionRegistry = RuntimeSessionRegistry.getInstance();
