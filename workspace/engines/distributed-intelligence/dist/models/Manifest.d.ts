export interface Manifest {
    name: string;
    version: string;
    buildDate: string;
    protocolVersion: string;
    modules: string[];
    capabilities: Record<string, any>;
    dependencies: Record<string, string>;
    supportedPlatforms: string[];
}
//# sourceMappingURL=Manifest.d.ts.map