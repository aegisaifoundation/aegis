import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { SecurityVerifier } from './SecurityVerifier.js';

export class CacheManager {
  private cacheDir: string;

  constructor(workspacePath: string) {
    this.cacheDir = path.join(workspacePath, 'package-manager/cache');
    fs.mkdirSync(this.cacheDir, { recursive: true });
  }

  public getCacheDir(): string {
    return this.cacheDir;
  }

  public getCachedPackage(packageId: string, version: string, expectedHash?: string): string | null {
    const cachedFile = path.join(this.cacheDir, `${packageId}-${version}.aeg`);
    if (fs.existsSync(cachedFile)) {
      if (expectedHash) {
        const isValid = SecurityVerifier.verifyFileChecksum(cachedFile, expectedHash);
        if (!isValid) {
          console.warn(`[CacheManager] Cache invalid for ${packageId}-${version}: checksum mismatch. Deleting.`);
          fs.rmSync(cachedFile, { force: true });
          return null;
        }
      }
      return cachedFile;
    }
    return null;
  }

  public addPackageToCache(packageId: string, version: string, tempFilePath: string): string {
    const destPath = path.join(this.cacheDir, `${packageId}-${version}.aeg`);
    if (tempFilePath !== destPath) {
      fs.copyFileSync(tempFilePath, destPath);
    }
    return destPath;
  }

  public extractPackage(archivePath: string, destDir: string): void {
    fs.mkdirSync(destDir, { recursive: true });

    const isZip = archivePath.endsWith('.aeg') || archivePath.endsWith('.zip');
    if (!isZip) {
      // If it is already a directory, copy recursively (fallback for folder-based installation)
      if (fs.statSync(archivePath).isDirectory()) {
        fs.cpSync(archivePath, destDir, { recursive: true });
        return;
      }
      throw new Error(`Unsupported package archive format: ${path.basename(archivePath)}`);
    }

    console.log(`[CacheManager] Extracting package archive ${path.basename(archivePath)}...`);
    const isWindows = process.platform === 'win32';

    let result;
    if (isWindows) {
      result = spawnSync('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        `Expand-Archive -Path '${archivePath}' -DestinationPath '${destDir}' -Force`
      ]);
    } else {
      result = spawnSync('unzip', ['-o', archivePath, '-d', destDir]);
    }

    if (result.status !== 0) {
      const errorMsg = result.stderr?.toString() || 'Unknown extraction error';
      throw new Error(`Failed to extract package archive: ${errorMsg}`);
    }
    
    console.log(`[CacheManager] Extraction completed successfully.`);
  }

  public clean(): void {
    if (fs.existsSync(this.cacheDir)) {
      fs.rmSync(this.cacheDir, { recursive: true, force: true });
      fs.mkdirSync(this.cacheDir, { recursive: true });
      console.log('[CacheManager] Package cache cleared.');
    }
  }
}
