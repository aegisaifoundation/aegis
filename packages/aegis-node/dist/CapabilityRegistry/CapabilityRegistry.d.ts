import { NodeRegistry } from '../NodeRegistry/NodeRegistry.js';
export interface CapabilitySummary {
    name: string;
    version: string;
    type: string;
    description?: string;
}
export declare class CapabilityRegistry {
    private nodeRegistry;
    private nodeId;
    constructor(nodeRegistry: NodeRegistry, nodeId: string);
    getCapabilitiesView(): CapabilitySummary[];
    getSerializedView(): string;
}
