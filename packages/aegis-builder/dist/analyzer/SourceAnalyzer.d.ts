export interface DiscoveredPackage {
    id: string;
    name: string;
    version: string;
    directory: string;
    dependencies: string[];
    capabilities: string[];
    permissions: string[];
}
export declare class SourceAnalyzer {
    private workspaceRoot;
    constructor(workspaceRoot?: string);
    discoverPackages(): Promise<DiscoveredPackage[]>;
    getBuildOrder(packages: DiscoveredPackage[]): DiscoveredPackage[];
}
