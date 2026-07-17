import { CapabilityInfo } from '../types/index.js';

export class CapabilityDiscoveryManager {
  private localCapabilities: CapabilityInfo;
  private registry = new Map<string, CapabilityInfo>();

  constructor(localNodeId: string) {
    this.localCapabilities = {
      nodeId: localNodeId,
      engines: ['collaboration', 'distributed-learning'],
      tools: ['OCR_Tool', 'MedicalSummarizer'],
      skills: ['ReasoningChainSkill'],
      models: ['llama-3', 'mistral-7b'],
      agents: ['DiagnosticAgent'],
      workflows: ['MedicalWorkflow'],
      datasets: [{ id: 'clinical-ds-01', name: 'Clinical Notes Summary', description: 'De-identified notes metadata' }],
      resourceLimits: {
        cpu: 8,
        memory: 16384,
        storage: 500000,
        gpu: true
      },
      trustScore: 0.95
    };
    this.registry.set(localNodeId, this.localCapabilities);
  }

  getLocalCapabilities(): CapabilityInfo {
    return this.localCapabilities;
  }

  registerRemoteCapabilities(nodeId: string, caps: CapabilityInfo): void {
    this.registry.set(nodeId, caps);
    console.log(`[CapabilityDiscoveryManager] Registered capabilities for node: ${nodeId}`);
  }

  discoverNodesByCapability(filter: {
    engine?: string;
    tool?: string;
    skill?: string;
    model?: string;
    agent?: string;
    workflow?: string;
    gpuRequired?: boolean;
    minTrust?: number;
  }): CapabilityInfo[] {
    const results: CapabilityInfo[] = [];

    for (const caps of this.registry.values()) {
      if (filter.engine && !caps.engines.includes(filter.engine)) continue;
      if (filter.tool && !caps.tools.includes(filter.tool)) continue;
      if (filter.skill && !caps.skills.includes(filter.skill)) continue;
      if (filter.model && !caps.models.includes(filter.model)) continue;
      if (filter.agent && !caps.agents.includes(filter.agent)) continue;
      if (filter.workflow && !caps.workflows.includes(filter.workflow)) continue;
      if (filter.gpuRequired && !caps.resourceLimits.gpu) continue;
      if (filter.minTrust !== undefined && caps.trustScore < filter.minTrust) continue;

      results.push(caps);
    }

    return results;
  }
}
