export interface EngineRegistryEntry {
    id: string;
    displayName: string;
    version: string;
    enabled: boolean;
    entry: string;
    manifest: string;
    runtimeApi: string;
    sdkVersion: string;
    installedAt: string;
}
export interface EngineRegistry {
    version: string;
    generatedBy: string;
    generatedAt: string;
    engines: EngineRegistryEntry[];
}
