import { IDataConnector } from './IDataConnector.js';
import { IProcessingPlugin } from './IProcessingPlugin.js';
export declare class ConnectorRegistry {
    private connectors;
    register(connector: IDataConnector): void;
    unregister(id: string): void;
    get(id: string): IDataConnector | undefined;
    list(): IDataConnector[];
    clear(): void;
}
export declare class ProcessorRegistry {
    private processors;
    register(processor: IProcessingPlugin): void;
    unregister(id: string): void;
    get(id: string): IProcessingPlugin | undefined;
    list(): IProcessingPlugin[];
    getByStage(stage: IProcessingPlugin['stage']): IProcessingPlugin[];
    clear(): void;
}
export declare const connectorRegistry: ConnectorRegistry;
export declare const processorRegistry: ProcessorRegistry;
