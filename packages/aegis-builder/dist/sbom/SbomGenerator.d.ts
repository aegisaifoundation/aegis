import { DiscoveredPackage } from '../analyzer/SourceAnalyzer.js';
export declare class SbomGenerator {
    generateSbom(packages: DiscoveredPackage[], packageChecksums: Record<string, string>, targetDir: string, format?: 'SPDX' | 'CycloneDX'): Promise<string>;
}
