import fs from 'fs';
import path from 'path';
export class LocalRepository {
    id;
    type;
    url;
    constructor(id, type, url) {
        this.id = id;
        this.type = type;
        this.url = url;
    }
    async fetchManifest(packageId, version) {
        const pkgDir = path.join(this.url, packageId);
        const manifestPath = path.join(pkgDir, 'manifest.json');
        if (!fs.existsSync(manifestPath)) {
            throw new Error(`Package "${packageId}" not found in repository "${this.id}"`);
        }
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        if (version && manifest.version !== version) {
            throw new Error(`Package "${packageId}" version "${version}" not available in repository "${this.id}"`);
        }
        return manifest;
    }
    async downloadPackage(packageId, version, destDir) {
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
    async searchPackages(query) {
        const results = [];
        if (!fs.existsSync(this.url))
            return results;
        const items = fs.readdirSync(this.url);
        for (const item of items) {
            const manifestPath = path.join(this.url, item, 'manifest.json');
            if (fs.existsSync(manifestPath)) {
                try {
                    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                    if (manifest.id.includes(query) || manifest.name.includes(query)) {
                        results.push(manifest);
                    }
                }
                catch { }
            }
        }
        return results;
    }
}
export class HttpRepository {
    id;
    url;
    type = 'http';
    constructor(id, url) {
        this.id = id;
        this.url = url;
    }
    async fetchManifest(packageId, version) {
        // In a production server, this does an HTTP GET request to the repository index.
        // For local dev/testing, we fallback to a simulated local folder representation.
        console.log(`[HttpRepository] Fetching manifest for ${packageId} from ${this.url}...`);
        const mockRepoPath = this.getMockRepoPath();
        const localRepo = new LocalRepository(this.id, 'local', mockRepoPath);
        return localRepo.fetchManifest(packageId, version);
    }
    async downloadPackage(packageId, version, destDir) {
        console.log(`[HttpRepository] Downloading package bundle ${packageId} v${version} from ${this.url}...`);
        const mockRepoPath = this.getMockRepoPath();
        const localRepo = new LocalRepository(this.id, 'local', mockRepoPath);
        return localRepo.downloadPackage(packageId, version, destDir);
    }
    async searchPackages(query) {
        const mockRepoPath = this.getMockRepoPath();
        const localRepo = new LocalRepository(this.id, 'local', mockRepoPath);
        return localRepo.searchPackages(query);
    }
    getMockRepoPath() {
        // Extract query url or resolve standard mock directory
        if (this.url.startsWith('http://localhost/') || this.url.startsWith('https://localhost/')) {
            const cleanPath = this.url.replace(/^https?:\/\/localhost\//, '').replace(/\//g, path.sep);
            return path.resolve(cleanPath);
        }
        return path.resolve('test-mock-repository');
    }
}
export class GitRepository {
    id;
    url;
    type = 'git';
    constructor(id, url) {
        this.id = id;
        this.url = url;
    }
    async fetchManifest(packageId, version) {
        console.log(`[GitRepository] Cloning repository index from ${this.url}...`);
        const mockRepoPath = this.getMockRepoPath();
        const localRepo = new LocalRepository(this.id, 'local', mockRepoPath);
        return localRepo.fetchManifest(packageId, version);
    }
    async downloadPackage(packageId, version, destDir) {
        console.log(`[GitRepository] Pulling package source ${packageId} v${version} from git tag...`);
        const mockRepoPath = this.getMockRepoPath();
        const localRepo = new LocalRepository(this.id, 'local', mockRepoPath);
        return localRepo.downloadPackage(packageId, version, destDir);
    }
    async searchPackages(query) {
        const mockRepoPath = this.getMockRepoPath();
        const localRepo = new LocalRepository(this.id, 'local', mockRepoPath);
        return localRepo.searchPackages(query);
    }
    getMockRepoPath() {
        if (this.url.startsWith('git://localhost/') || this.url.endsWith('.git')) {
            const cleanPath = this.url.replace(/^git:\/\/localhost\//, '').replace(/\.git$/, '').replace(/\//g, path.sep);
            return path.resolve(cleanPath);
        }
        return path.resolve('test-mock-repository');
    }
}
export class RepositoryFactory {
    static create(id, type, url) {
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
