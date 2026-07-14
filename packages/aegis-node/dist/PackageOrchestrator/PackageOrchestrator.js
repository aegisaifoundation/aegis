import { PackageManager } from '@aegis/package-manager';
export class PackageOrchestrator {
    pkgManager;
    constructor(configPath, enginesDir) {
        this.pkgManager = new PackageManager(configPath, enginesDir);
    }
    async installPackage(packagePathOrId, options) {
        return await this.pkgManager.installPackage(packagePathOrId, options);
    }
    async uninstallPackage(packageId, options) {
        return await this.pkgManager.removePackage(packageId, options);
    }
    async updatePackage(packageId, options) {
        return await this.pkgManager.updatePackage(packageId, options);
    }
    async verifyPackage(packageId) {
        return await this.pkgManager.verifyPackage(packageId);
    }
    listInstalledPackages() {
        return this.pkgManager.listPackages();
    }
    getPackage(packageId) {
        try {
            return this.pkgManager.infoPackage(packageId);
        }
        catch {
            return null;
        }
    }
    // Get raw PackageManager instance if needed
    getUnderlyingManager() {
        return this.pkgManager;
    }
}
//# sourceMappingURL=PackageOrchestrator.js.map