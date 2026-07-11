import { serviceRegistry } from '../registry/ServiceRegistry.js';
const getMemoryIndexManager = () => serviceRegistry.get<any>('MemoryIndexManager');

import { SessionMetadata } from '@aegis/sdk';

export class RuntimeSessionRegistry {
  private static instance = new RuntimeSessionRegistry();

  public static getInstance(): RuntimeSessionRegistry {
    return this.instance;
  }

  /**
   * Retrieves the indexed summary of sessions.
   */
  public async listSessions(): Promise<any[]> {
    return await getMemoryIndexManager().listSessions();
  }

  /**
   * Delegates session registration directly to the getMemoryIndexManager().
   */
  public async registerSession(metadata: SessionMetadata): Promise<void> {
    await getMemoryIndexManager().registerSession(metadata);
  }

  /**
   * Delegates session unregistration directly to the getMemoryIndexManager().
   */
  public async unregisterSession(sessionId: string): Promise<void> {
    await getMemoryIndexManager().unregisterSession(sessionId);
  }
}

export const runtimeSessionRegistry = RuntimeSessionRegistry.getInstance();
