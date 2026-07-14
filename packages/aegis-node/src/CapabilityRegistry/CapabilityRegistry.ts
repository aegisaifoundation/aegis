import { NodeRegistry } from '../NodeRegistry/NodeRegistry.js';

export interface CapabilitySummary {
  name: string;
  version: string;
  type: string;
  description?: string;
}

export class CapabilityRegistry {
  constructor(private nodeRegistry: NodeRegistry, private nodeId: string) {}

  getCapabilitiesView(): CapabilitySummary[] {
    const list: CapabilitySummary[] = [];

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

  getSerializedView(): string {
    const view = {
      nodeId: this.nodeId,
      capabilities: this.getCapabilitiesView()
    };
    return JSON.stringify(view);
  }
}
