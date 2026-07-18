import { PlatformCapability } from '../types/index.js';
export declare class CapabilityRegistry {
    private registry;
    private eventBus;
    constructor(eventBus?: any);
    setEventBus(eventBus: any): void;
    registerCapabilities(engineId: string, cap: Omit<PlatformCapability, 'engineId'>): void;
    unregisterCapabilities(engineId: string): void;
    getCapabilities(engineId: string): PlatformCapability | undefined;
    listAllCapabilities(): PlatformCapability[];
    clear(): void;
}
export declare const capabilityRegistry: CapabilityRegistry;
export default capabilityRegistry;
