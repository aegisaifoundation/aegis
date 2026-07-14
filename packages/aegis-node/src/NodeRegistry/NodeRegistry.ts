import { PackageType, PackageInfo } from '@aegis/package-manager';

export interface PackageManagerClient {
  listPackages(): PackageInfo[];
  infoPackage(packageId: string): PackageInfo;
}

export class NodeRegistry {
  constructor(private pkgManager: PackageManagerClient) {}

  getInstalledPackages(type?: PackageType): PackageInfo[] {
    const pkgs = this.pkgManager.listPackages();
    if (type) {
      return pkgs.filter(p => p.type === type);
    }
    return pkgs;
  }

  getInstalledEngines(): PackageInfo[] {
    return this.getInstalledPackages('Engine');
  }

  getInstalledTools(): PackageInfo[] {
    return this.getInstalledPackages('Tool');
  }

  getInstalledSkills(): PackageInfo[] {
    return this.getInstalledPackages('Skill');
  }

  getInstalledPlugins(): PackageInfo[] {
    return this.getInstalledPackages('Plugin');
  }

  getInstalledProviders(): PackageInfo[] {
    return this.getInstalledPackages('Provider' as PackageType);
  }

  getInstalledModels(): PackageInfo[] {
    return this.getInstalledPackages('Model');
  }

  getInstalledApplications(): PackageInfo[] {
    return this.getInstalledPackages('Application');
  }

  getPackage(packageId: string): PackageInfo | null {
    try {
      return this.pkgManager.infoPackage(packageId);
    } catch {
      return null;
    }
  }
}
