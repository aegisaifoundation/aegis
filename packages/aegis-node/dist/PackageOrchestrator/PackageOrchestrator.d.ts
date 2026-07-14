import { PackageManager, PackageInfo } from '@aegis/package-manager';
export declare class PackageOrchestrator {
    private pkgManager;
    constructor(configPath: string, enginesDir: string);
    installPackage(packagePathOrId: string, options?: any): Promise<string>;
    uninstallPackage(packageId: string, options?: any): Promise<string>;
    updatePackage(packageId: string, options?: any): Promise<string>;
    verifyPackage(packageId: string): Promise<boolean>;
    listInstalledPackages(): PackageInfo[];
    getPackage(packageId: string): PackageInfo | null;
    getUnderlyingManager(): PackageManager;
}
