import { DiscoveredPackage } from '../analyzer/SourceAnalyzer.js';
export declare class PackageBuilder {
    buildPackage(pkg: DiscoveredPackage, targetDir: string): Promise<string>;
}
