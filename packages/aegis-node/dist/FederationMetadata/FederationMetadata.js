export class FederationManager {
    configManager;
    constructor(configManager) {
        this.configManager = configManager;
    }
    getMetadata() {
        const config = this.configManager.get();
        return config.federation || { enabled: false, joined: false, clusters: [] };
    }
    updateMetadata(updates) {
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
    enableFederation() {
        this.updateMetadata({ enabled: true });
    }
    disableFederation() {
        this.updateMetadata({ enabled: false, joined: false, clusters: [] });
    }
    joinCluster(clusterId) {
        const meta = this.getMetadata();
        const clusters = meta.clusters || [];
        if (!clusters.includes(clusterId)) {
            clusters.push(clusterId);
        }
        this.updateMetadata({ joined: true, clusters });
    }
    leaveCluster(clusterId) {
        const meta = this.getMetadata();
        const clusters = (meta.clusters || []).filter(c => c !== clusterId);
        const joined = clusters.length > 0;
        this.updateMetadata({ joined, clusters });
    }
}
//# sourceMappingURL=FederationMetadata.js.map