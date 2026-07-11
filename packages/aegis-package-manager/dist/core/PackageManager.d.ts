import { PackageInfo } from '../types/Manifest.js';
export declare class PackageManager {
    private configPath;
    private enginesDir;
    private db;
    private txManager;
    private cacheManager;
    private repositories;
    constructor(configPath: string, enginesDir: string);
    installPackage(packagePathOrId: string, options?: {
        version?: string;
        repoId?: string;
        force?: boolean;
    }): Promise<string>;
    removePackage(packageId: string, options?: {
        force?: boolean;
    }): Promise<string>;
    updatePackage(packageId: string, options?: {
        version?: string;
        repoId?: string;
    }): Promise<string>;
    verifyPackage(packageId: string): Promise<boolean>;
    listPackages(): PackageInfo[];
    infoPackage(packageId: string): PackageInfo;
    addRepository(id: string, type: 'local' | 'git' | 'http' | 'offline', url: string): void;
    removeRepository(id: string): void;
    getRepositories(): {
        id: string;
        type: "local" | "git" | "http" | "offline";
        url: string;
    }[];
    private getRuntimeConfig;
    private saveRuntimeConfig;
    private listInstalledManifests;
    private loadRepositoriesFromDb;
    private resolvePackageFromRepositories;
    private notifyRuntime;
}
