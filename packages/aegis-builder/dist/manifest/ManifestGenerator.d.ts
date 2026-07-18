import { PreReleaseChannel } from '../types/index.js';
export declare class ManifestGenerator {
    generateManifest(version: string, buildNumber: string, channel: PreReleaseChannel, packageChecksums: Record<string, string>, bundles: Record<string, string[]>, targetDir: string): Promise<string>;
}
