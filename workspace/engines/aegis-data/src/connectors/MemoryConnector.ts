import { IDataConnector, RawSample } from '../interfaces/IDataConnector.js';
import { serviceRegistry } from '@aegis/runtime';

export class MemoryConnector implements IDataConnector {
  readonly id: string;
  readonly type = 'Memory';
  private connected = false;
  private sessionIds: string[] = ['default'];

  constructor(id: string) {
    this.id = id;
  }

  async connect(config?: { sessionIds?: string[] }): Promise<void> {
    if (config?.sessionIds) {
      this.sessionIds = config.sessionIds;
    }
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async collect(): Promise<RawSample[]> {
    if (!this.connected) throw new Error('Connector is not connected');

    const memoryManager = serviceRegistry.get<any>('memoryManager');
    if (!memoryManager) {
      // Return empty if memoryManager is not registered (e.g. during standalone tests)
      return [];
    }

    const samples: RawSample[] = [];

    for (const sessionId of this.sessionIds) {
      try {
        const history = await memoryManager.getHistory(sessionId, 'system');
        if (history) {
          for (const msg of history) {
            // Check if explicitly approved in metadata
            const approved = msg.metadata?.approved === true || msg.metadata?.allowTraining === true;
            if (approved) {
              samples.push({
                id: `memory-${msg.id}`,
                content: msg.content,
                metadata: {
                  sessionId,
                  role: msg.role,
                  timestamp: msg.timestamp,
                  approved: true
                }
              });
            }
          }
        }
      } catch (err) {
        // Skip session errors
      }
    }

    return samples;
  }

  async validate(): Promise<boolean> {
    return this.connected && serviceRegistry.has('memoryManager');
  }

  async watch(onChange: (event: any) => void): Promise<void> {}

  async metadata(): Promise<Record<string, any>> {
    return {
      sessionIds: this.sessionIds,
      connected: this.connected
    };
  }

  async statistics(): Promise<Record<string, any>> {
    const samples = await this.collect();
    return {
      approvedMemoriesCount: samples.length
    };
  }
}
