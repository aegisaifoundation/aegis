import { CapabilityInfo } from '../types/index.js';
export declare class CapabilityDiscoveryManager {
    private localCapabilities;
    private registry;
    constructor(localNodeId: string);
    getLocalCapabilities(): CapabilityInfo;
    registerRemoteCapabilities(nodeId: string, caps: CapabilityInfo): void;
    discoverNodesByCapability(filter: {
        engine?: string;
        tool?: string;
        skill?: string;
        model?: string;
        agent?: string;
        workflow?: string;
        gpuRequired?: boolean;
        minTrust?: number;
    }): CapabilityInfo[];
}
