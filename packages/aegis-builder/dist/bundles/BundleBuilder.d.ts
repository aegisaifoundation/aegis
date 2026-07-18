export interface BundleSpec {
    name: string;
    packages: string[];
    description: string;
}
export declare class BundleBuilder {
    buildBundle(spec: BundleSpec, packageChecksums: Record<string, string>, targetDir: string): Promise<string>;
}
