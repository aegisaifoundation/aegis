import { PackageType, PackageInfo } from '@aegis/package-manager';
export interface PackageManagerClient {
    listPackages(): PackageInfo[];
    infoPackage(packageId: string): PackageInfo;
}
export declare class NodeRegistry {
    private pkgManager;
    constructor(pkgManager: PackageManagerClient);
    getInstalledPackages(type?: PackageType): PackageInfo[];
    getInstalledEngines(): PackageInfo[];
    getInstalledTools(): PackageInfo[];
    getInstalledSkills(): PackageInfo[];
    getInstalledPlugins(): PackageInfo[];
    getInstalledProviders(): PackageInfo[];
    getInstalledModels(): PackageInfo[];
    getInstalledApplications(): PackageInfo[];
    getPackage(packageId: string): PackageInfo | null;
}
