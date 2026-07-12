export declare class CacheManager {
    private cacheDir;
    constructor(workspacePath: string);
    getCacheDir(): string;
    getCachedPackage(packageId: string, version: string, expectedHash?: string): string | null;
    addPackageToCache(packageId: string, version: string, tempFilePath: string): string;
    extractPackage(archivePath: string, destDir: string): void;
    clean(): void;
}
