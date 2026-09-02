import { INodeCapabilities, INodeLoad } from '@aegis/sdk';
export declare class NodeCapabilityRegistry {
    private readonly localNodeId;
    private capabilitiesMap;
    private loadMap;
    constructor(localNodeId: string);
    registerCapabilities(caps: INodeCapabilities): void;
    getCapabilities(nodeId: string): INodeCapabilities | undefined;
    listCapabilities(): INodeCapabilities[];
    removeCapabilities(nodeId: string): void;
    updateNodeLoad(load: INodeLoad): void;
    getNodeLoad(nodeId: string): INodeLoad | undefined;
    clear(): void;
}
