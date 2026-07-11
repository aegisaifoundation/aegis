import { PackageManifest } from '../types/Manifest.js';
export interface IRepository {
    id: string;
    type: 'local' | 'git' | 'http' | 'offline';
    url: string;
    fetchManifest(packageId: string, version?: string): Promise<PackageManifest>;
    downloadPackage(packageId: string, version: string, destDir: string): Promise<string>;
    searchPackages(query: string): Promise<PackageManifest[]>;
}
export declare class LocalRepository implements IRepository {
    id: string;
    type: 'local' | 'offline';
    url: string;
    constructor(id: string, type: 'local' | 'offline', url: string);
    fetchManifest(packageId: string, version?: string): Promise<PackageManifest>;
    downloadPackage(packageId: string, version: string, destDir: string): Promise<string>;
    searchPackages(query: string): Promise<PackageManifest[]>;
}
export declare class HttpRepository implements IRepository {
    id: string;
    url: string;
    type: 'http';
    constructor(id: string, url: string);
    fetchManifest(packageId: string, version?: string): Promise<PackageManifest>;
    downloadPackage(packageId: string, version: string, destDir: string): Promise<string>;
    searchPackages(query: string): Promise<PackageManifest[]>;
    private getMockRepoPath;
}
export declare class GitRepository implements IRepository {
    id: string;
    url: string;
    type: 'git';
    constructor(id: string, url: string);
    fetchManifest(packageId: string, version?: string): Promise<PackageManifest>;
    downloadPackage(packageId: string, version: string, destDir: string): Promise<string>;
    searchPackages(query: string): Promise<PackageManifest[]>;
    private getMockRepoPath;
}
export declare class RepositoryFactory {
    static create(id: string, type: string, url: string): IRepository;
}
