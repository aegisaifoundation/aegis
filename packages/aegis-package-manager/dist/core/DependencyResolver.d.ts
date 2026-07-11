import { PackageManifest } from '../types/Manifest.js';
export interface DependencyNode {
    id: string;
    manifest: PackageManifest;
    dependencies: string[];
}
export declare class DependencyResolver {
    static resolve(targets: PackageManifest[], availablePackages: Record<string, PackageManifest>): PackageManifest[];
}
