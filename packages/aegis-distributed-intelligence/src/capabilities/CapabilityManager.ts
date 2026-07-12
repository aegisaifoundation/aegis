import { Capability } from '../models/Capability.js';

export class CapabilityManager {
  private capabilities: Capability = {
    engineVersion: '1.0.0',
    buildVersion: '1.0.0',
    platform: process.platform,
    cpuArch: process.arch,
    supportedModules: [],
    gpuSupport: false,
    cudaSupport: false,
    availableTransports: ['stdio'],
    enabledFeatures: [],
    protocolVersion: '1.0.0'
  };

  constructor() {}

  registerCapabilities(incoming: Partial<Capability>): void {
    this.capabilities = {
      ...this.capabilities,
      ...incoming
    };
  }

  getCapabilities(): Capability {
    return this.capabilities;
  }

  hasFeature(feature: string): boolean {
    return this.capabilities.enabledFeatures.includes(feature) || 
           this.capabilities.supportedModules.includes(feature);
  }
}
export default CapabilityManager;
