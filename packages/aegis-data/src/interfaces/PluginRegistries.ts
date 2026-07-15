import { IDataConnector } from './IDataConnector.js';
import { IProcessingPlugin } from './IProcessingPlugin.js';

export class ConnectorRegistry {
  private connectors = new Map<string, IDataConnector>();

  register(connector: IDataConnector): void {
    this.connectors.set(connector.id, connector);
  }

  unregister(id: string): void {
    this.connectors.delete(id);
  }

  get(id: string): IDataConnector | undefined {
    return this.connectors.get(id);
  }

  list(): IDataConnector[] {
    return Array.from(this.connectors.values());
  }

  clear(): void {
    this.connectors.clear();
  }
}

export class ProcessorRegistry {
  private processors = new Map<string, IProcessingPlugin>();

  register(processor: IProcessingPlugin): void {
    this.processors.set(processor.id, processor);
  }

  unregister(id: string): void {
    this.processors.delete(id);
  }

  get(id: string): IProcessingPlugin | undefined {
    return this.processors.get(id);
  }

  list(): IProcessingPlugin[] {
    return Array.from(this.processors.values());
  }

  getByStage(stage: IProcessingPlugin['stage']): IProcessingPlugin[] {
    return this.list().filter(p => p.stage === stage);
  }

  clear(): void {
    this.processors.clear();
  }
}

export const connectorRegistry = new ConnectorRegistry();
export const processorRegistry = new ProcessorRegistry();
