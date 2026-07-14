import { PackageManager, PackageInfo } from '@aegis/package-manager';

export class PackageOrchestrator {
  private pkgManager: PackageManager;

  constructor(configPath: string, enginesDir: string) {
    this.pkgManager = new PackageManager(configPath, enginesDir);
  }

  async installPackage(packagePathOrId: string, options?: any): Promise<string> {
    return await this.pkgManager.installPackage(packagePathOrId, options);
  }

  async uninstallPackage(packageId: string, options?: any): Promise<string> {
    return await this.pkgManager.removePackage(packageId, options);
  }

  async updatePackage(packageId: string, options?: any): Promise<string> {
    return await this.pkgManager.updatePackage(packageId, options);
  }

  async verifyPackage(packageId: string): Promise<boolean> {
    return await this.pkgManager.verifyPackage(packageId);
  }

  listInstalledPackages(): PackageInfo[] {
    return this.pkgManager.listPackages();
  }

  getPackage(packageId: string): PackageInfo | null {
    try {
      return this.pkgManager.infoPackage(packageId);
    } catch {
      return null;
    }
  }

  // Get raw PackageManager instance if needed
  getUnderlyingManager(): PackageManager {
    return this.pkgManager;
  }
}
