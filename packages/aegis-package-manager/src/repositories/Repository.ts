import fs from 'fs';
import path from 'path';
import { PackageManifest } from '../types/Manifest.js';

export interface IRepository {
  id: string;
  type: 'local' | 'git' | 'http' | 'offline';
  url: string;
  fetchManifest(packageId: string, version?: string): Promise<PackageManifest>;
  downloadPackage(packageId: string, version: string, destDir: string): Promise<string>;
  searchPackages(query: string): Promise<PackageManifest[]>;
}

export class LocalRepository implements IRepository {
  constructor(public id: string, public type: 'local' | 'offline', public url: string) {}

  public async fetchManifest(packageId: string, version?: string): Promise<PackageManifest> {
    const pkgDir = path.join(this.url, packageId);
    const manifestPath = path.join(pkgDir, 'manifest.json');
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Package "${packageId}" not found in repository "${this.id}"`);
    }
    const manifest: PackageManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (version && manifest.version !== version) {
      throw new Error(`Package "${packageId}" version "${version}" not available in repository "${this.id}"`);
    }
    return manifest;
  }

  public async downloadPackage(packageId: string, version: string, destDir: string): Promise<string> {
    const pkgDir = path.join(this.url, packageId);
    
    // Check if a pre-bundled .aeg exists, otherwise treat as folder
    const aegPath = path.join(this.url, `${packageId}-${version}.aeg`);
    if (fs.existsSync(aegPath)) {
      const destPath = path.join(destDir, `${packageId}-${version}.aeg`);
      fs.copyFileSync(aegPath, destPath);
      return destPath;
    }

    if (!fs.existsSync(pkgDir)) {
      throw new Error(`Package source folder not found: ${pkgDir}`);
    }

    // For folders, we mock zip download by returning the directory path directly
    return pkgDir;
  }

  public async searchPackages(query: string): Promise<PackageManifest[]> {
    const results: PackageManifest[] = [];
    if (!fs.existsSync(this.url)) return results;
    
    const items = fs.readdirSync(this.url);
    for (const item of items) {
      const manifestPath = path.join(this.url, item, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest: PackageManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          if (manifest.id.includes(query) || manifest.name.includes(query)) {
            results.push(manifest);
          }
        } catch {}
      }
    }
    return results;
  }
}

export class HttpRepository implements IRepository {
  public type: 'http' = 'http';
  constructor(public id: string, public url: string) {}

  public async fetchManifest(packageId: string, version?: string): Promise<PackageManifest> {
    // In a production server, this does an HTTP GET request to the repository index.
    // For local dev/testing, we fallback to a simulated local folder representation.
    console.log(`[HttpRepository] Fetching manifest for ${packageId} from ${this.url}...`);
    const mockRepoPath = this.getMockRepoPath();
    const localRepo = new LocalRepository(this.id, 'local', mockRepoPath);
    return localRepo.fetchManifest(packageId, version);
  }

  public async downloadPackage(packageId: string, version: string, destDir: string): Promise<string> {
    console.log(`[HttpRepository] Downloading package bundle ${packageId} v${version} from ${this.url}...`);
    const mockRepoPath = this.getMockRepoPath();
    const localRepo = new LocalRepository(this.id, 'local', mockRepoPath);
    return localRepo.downloadPackage(packageId, version, destDir);
  }

  public async searchPackages(query: string): Promise<PackageManifest[]> {
    const mockRepoPath = this.getMockRepoPath();
    const localRepo = new LocalRepository(this.id, 'local', mockRepoPath);
    return localRepo.searchPackages(query);
  }

  private getMockRepoPath(): string {
    // Extract query url or resolve standard mock directory
    if (this.url.startsWith('http://localhost/') || this.url.startsWith('https://localhost/')) {
      const cleanPath = this.url.replace(/^https?:\/\/localhost\//, '').replace(/\//g, path.sep);
      return path.resolve(cleanPath);
    }
    return path.resolve('test-mock-repository');
  }
}

export class GitRepository implements IRepository {
  public type: 'git' = 'git';
  constructor(public id: string, public url: string) {}

  public async fetchManifest(packageId: string, version?: string): Promise<PackageManifest> {
    console.log(`[GitRepository] Cloning repository index from ${this.url}...`);
    const mockRepoPath = this.getMockRepoPath();
    const localRepo = new LocalRepository(this.id, 'local', mockRepoPath);
    return localRepo.fetchManifest(packageId, version);
  }

  public async downloadPackage(packageId: string, version: string, destDir: string): Promise<string> {
    console.log(`[GitRepository] Pulling package source ${packageId} v${version} from git tag...`);
    const mockRepoPath = this.getMockRepoPath();
    const localRepo = new LocalRepository(this.id, 'local', mockRepoPath);
    return localRepo.downloadPackage(packageId, version, destDir);
  }

  public async searchPackages(query: string): Promise<PackageManifest[]> {
    const mockRepoPath = this.getMockRepoPath();
    const localRepo = new LocalRepository(this.id, 'local', mockRepoPath);
    return localRepo.searchPackages(query);
  }

  private getMockRepoPath(): string {
    if (this.url.startsWith('git://localhost/') || this.url.endsWith('.git')) {
      const cleanPath = this.url.replace(/^git:\/\/localhost\//, '').replace(/\.git$/, '').replace(/\//g, path.sep);
      return path.resolve(cleanPath);
    }
    return path.resolve('test-mock-repository');
  }
}

export class RepositoryFactory {
  public static create(id: string, type: string, url: string): IRepository {
    if (type === 'local' || type === 'offline') {
      return new LocalRepository(id, type, url);
    }
    if (type === 'http') {
      return new HttpRepository(id, url);
    }
    if (type === 'git') {
      return new GitRepository(id, url);
    }
    throw new Error(`Unsupported repository type: "${type}"`);
  }
}
