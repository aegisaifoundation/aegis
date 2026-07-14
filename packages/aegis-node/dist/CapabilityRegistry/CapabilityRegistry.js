export class CapabilityRegistry {
    nodeRegistry;
    nodeId;
    constructor(nodeRegistry, nodeId) {
        this.nodeRegistry = nodeRegistry;
        this.nodeId = nodeId;
    }
    getCapabilitiesView() {
        const list = [];
        // Add Engines
        for (const p of this.nodeRegistry.getInstalledEngines()) {
            list.push({ name: p.name || p.id, version: p.version, type: 'Engine' });
        }
        // Add Tools
        for (const p of this.nodeRegistry.getInstalledTools()) {
            list.push({ name: p.name || p.id, version: p.version, type: 'Tool' });
        }
        // Add Skills
        for (const p of this.nodeRegistry.getInstalledSkills()) {
            list.push({ name: p.name || p.id, version: p.version, type: 'Skill' });
        }
        // Add Plugins
        for (const p of this.nodeRegistry.getInstalledPlugins()) {
            list.push({ name: p.name || p.id, version: p.version, type: 'Plugin' });
        }
        // Add Providers
        for (const p of this.nodeRegistry.getInstalledProviders()) {
            list.push({ name: p.name || p.id, version: p.version, type: 'Provider' });
        }
        return list;
    }
    getSerializedView() {
        const view = {
            nodeId: this.nodeId,
            capabilities: this.getCapabilitiesView()
        };
        return JSON.stringify(view);
    }
}
//# sourceMappingURL=CapabilityRegistry.js.map