import { IDataConnector, RawSample } from '../interfaces/IDataConnector.js';
import { serviceRegistry } from '@aegis/runtime';

export class KnowledgeConnector implements IDataConnector {
  readonly id: string;
  readonly type = 'Knowledge';
  private connected = false;

  constructor(id: string) {
    this.id = id;
  }

  async connect(config?: any): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  async collect(): Promise<RawSample[]> {
    if (!this.connected) throw new Error('Connector is not connected');
    
    const knowledgeSync = serviceRegistry.get<any>('knowledge-sync');
    if (!knowledgeSync) {
      // Graceful fallback mock graph if knowledge-sync is not present or placeholder
      return [
        {
          id: 'knowledge-mock-1',
          content: 'Fact: AEGIS platform consists of core runtime, memory subsystem, and distributed intelligence engine.',
          metadata: { category: 'architecture', node: 'AEGIS Overview' }
        }
      ];
    }

    // Call future knowledge sync engine graph APIs
    try {
      if (typeof knowledgeSync.getKnowledgeGraph === 'function') {
        const graph = await knowledgeSync.getKnowledgeGraph();
        return graph.nodes.map((node: any) => ({
          id: `knowledge-${node.id}`,
          content: `${node.label}: ${node.description || ''}`,
          metadata: { ...node.properties, source: 'knowledge-sync' }
        }));
      }
    } catch {
      // Fallback
    }

    return [
      {
        id: 'knowledge-sync-placeholder',
        content: 'Fact: Knowledge Sync Engine was resolved but is currently in placeholder mode.',
        metadata: { status: 'placeholder' }
      }
    ];
  }

  async validate(): Promise<boolean> {
    return this.connected;
  }

  async watch(onChange: (event: any) => void): Promise<void> {}

  async metadata(): Promise<Record<string, any>> {
    return {
      connected: this.connected,
      hasKnowledgeSyncEngine: serviceRegistry.has('knowledge-sync')
    };
  }

  async statistics(): Promise<Record<string, any>> {
    const samples = await this.collect();
    return {
      knowledgeNodesCount: samples.length
    };
  }
}
