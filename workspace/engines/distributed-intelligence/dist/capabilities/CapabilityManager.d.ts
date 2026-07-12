import { Capability } from '../models/Capability.js';
export declare class CapabilityManager {
    private capabilities;
    constructor();
    registerCapabilities(incoming: Partial<Capability>): void;
    getCapabilities(): Capability;
    hasFeature(feature: string): boolean;
}
export default CapabilityManager;
//# sourceMappingURL=CapabilityManager.d.ts.map