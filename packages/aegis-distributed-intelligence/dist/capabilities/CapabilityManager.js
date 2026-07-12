export class CapabilityManager {
    capabilities = {
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
    constructor() { }
    registerCapabilities(incoming) {
        this.capabilities = {
            ...this.capabilities,
            ...incoming
        };
    }
    getCapabilities() {
        return this.capabilities;
    }
    hasFeature(feature) {
        return this.capabilities.enabledFeatures.includes(feature) ||
            this.capabilities.supportedModules.includes(feature);
    }
}
export default CapabilityManager;
//# sourceMappingURL=CapabilityManager.js.map