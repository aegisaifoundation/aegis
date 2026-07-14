import { NodeConfigManager } from '../NodeConfiguration/NodeConfigManager.js';

export interface FederationMetadataSchema {
  enabled: boolean;
  joined: boolean;
  clusters: string[];
}

export class FederationManager {
  constructor(private configManager: NodeConfigManager) {}

  getMetadata(): FederationMetadataSchema {
    const config = this.configManager.get();
    return config.federation || { enabled: false, joined: false, clusters: [] };
  }

  updateMetadata(updates: Partial<FederationMetadataSchema>): FederationMetadataSchema {
    const current = this.getMetadata();
    const updated = {
      ...current,
      ...updates
    };
    
    this.configManager.update({
      federation: updated
    });

    return updated;
  }

  enableFederation(): void {
    this.updateMetadata({ enabled: true });
  }

  disableFederation(): void {
    this.updateMetadata({ enabled: false, joined: false, clusters: [] });
  }

  joinCluster(clusterId: string): void {
    const meta = this.getMetadata();
    const clusters = meta.clusters || [];
    if (!clusters.includes(clusterId)) {
      clusters.push(clusterId);
    }
    this.updateMetadata({ joined: true, clusters });
  }

  leaveCluster(clusterId: string): void {
    const meta = this.getMetadata();
    const clusters = (meta.clusters || []).filter(c => c !== clusterId);
    const joined = clusters.length > 0;
    this.updateMetadata({ joined, clusters });
  }
}
