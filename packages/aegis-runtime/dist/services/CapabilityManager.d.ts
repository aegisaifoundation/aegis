export declare enum CapabilityType {
    TOOL = "tool",
    PLUGIN = "plugin",
    SKILL = "skill",
    PROVIDER = "provider"
}
export declare class CapabilityManager {
    add(type: CapabilityType, capabilityPath: string): Promise<void>;
    remove(type: CapabilityType, capabilityPath: string): Promise<void>;
    update(type: CapabilityType, capabilityPath: string): Promise<void>;
}
export declare const capabilityManager: CapabilityManager;
export declare const ToolLoader: {};
