export class NodeRegistry {
    pkgManager;
    constructor(pkgManager) {
        this.pkgManager = pkgManager;
    }
    getInstalledPackages(type) {
        const pkgs = this.pkgManager.listPackages();
        if (type) {
            return pkgs.filter(p => p.type === type);
        }
        return pkgs;
    }
    getInstalledEngines() {
        return this.getInstalledPackages('Engine');
    }
    getInstalledTools() {
        return this.getInstalledPackages('Tool');
    }
    getInstalledSkills() {
        return this.getInstalledPackages('Skill');
    }
    getInstalledPlugins() {
        return this.getInstalledPackages('Plugin');
    }
    getInstalledProviders() {
        return this.getInstalledPackages('Provider');
    }
    getInstalledModels() {
        return this.getInstalledPackages('Model');
    }
    getInstalledApplications() {
        return this.getInstalledPackages('Application');
    }
    getPackage(packageId) {
        try {
            return this.pkgManager.infoPackage(packageId);
        }
        catch {
            return null;
        }
    }
}
//# sourceMappingURL=NodeRegistry.js.map