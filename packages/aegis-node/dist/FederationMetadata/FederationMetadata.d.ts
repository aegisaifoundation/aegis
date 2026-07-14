import { NodeConfigManager } from '../NodeConfiguration/NodeConfigManager.js';
export interface FederationMetadataSchema {
    enabled: boolean;
    joined: boolean;
    clusters: string[];
}
export declare class FederationManager {
    private configManager;
    constructor(configManager: NodeConfigManager);
    getMetadata(): FederationMetadataSchema;
    updateMetadata(updates: Partial<FederationMetadataSchema>): FederationMetadataSchema;
    enableFederation(): void;
    disableFederation(): void;
    joinCluster(clusterId: string): void;
    leaveCluster(clusterId: string): void;
}
