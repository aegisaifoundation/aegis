import { SignatureSigner } from './SignatureSigner.js';
export interface BuildOptions {
    packageId: string;
    sourceDir: string;
    outputDir: string;
    profile: 'Development' | 'Debug' | 'Testing' | 'Production' | 'Enterprise';
    channel: 'stable' | 'alpha' | 'beta' | 'nightly';
}
export interface BundleOptions {
    bundleId: string;
    version: string;
    packages: Array<{
        id: string;
        version: string;
        path: string;
    }>;
    outputDir: string;
    publisher: string;
}
export declare class DistributionBuilder {
    private signer;
    constructor(signer: SignatureSigner);
    buildPackage(options: BuildOptions): Promise<string>;
    buildBundle(options: BundleOptions): Promise<string>;
    generateRepositoryIndex(repoDir: string): Promise<string>;
    private extractManifestFromPackage;
    private extractBundleJsonFromBundle;
    private compareVersions;
    generateReleaseManifest(options: {
        releaseVersion: string;
        packages: Array<{
            id: string;
            version: string;
            checksum: string;
        }>;
        bundles: Array<{
            id: string;
            version: string;
            checksum: string;
        }>;
        outputDir: string;
    }): Promise<string>;
    private stripDevelopmentFiles;
    private collectChecksumsRecursive;
    private archiveDirectory;
}
