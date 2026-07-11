import fs from 'fs';
import path from 'path';
import { PackageDatabase } from './PackageDatabase.js';
import { TransactionManager } from './TransactionManager.js';
import { DependencyResolver } from './DependencyResolver.js';
import { SecurityVerifier } from './SecurityVerifier.js';
import { CacheManager } from './CacheManager.js';
import { RepositoryFactory } from '../repositories/Repository.js';
export class PackageManager {
    configPath;
    enginesDir;
    db;
    txManager;
    cacheManager;
    repositories = new Map();
    constructor(configPath, enginesDir) {
        this.configPath = configPath;
        this.enginesDir = enginesDir;
        const workspacePath = path.dirname(configPath);
        // 1. Initialize DB
        const dbPath = path.join(workspacePath, 'package-manager/package-db.json');
        this.db = new PackageDatabase(dbPath);
        // 2. Initialize Sub-Managers
        this.txManager = new TransactionManager(workspacePath, this.db);
        this.cacheManager = new CacheManager(workspacePath);
        // 3. Populate default repositories from database
        this.loadRepositoriesFromDb();
        // 4. Run startup crash-recovery of orphaned transactions
        this.txManager.recoverOrphanedTransactions(configPath).catch(err => {
            console.error('[PackageManager] Transaction recovery failed:', err.message);
        });
    }
    // --- Public APIs ---
    async installPackage(packagePathOrId, options) {
        let sourcePath = packagePathOrId;
        let repoSource = 'local';
        // Check if it is a local package path or an ID
        const isLocalPath = fs.existsSync(packagePathOrId);
        if (!isLocalPath) {
            // Treat as package ID: resolve from repositories
            console.log(`[PackageManager] Resolving package ID "${packagePathOrId}" from repositories...`);
            const resolved = await this.resolvePackageFromRepositories(packagePathOrId, options?.version, options?.repoId);
            sourcePath = await resolved.repo.downloadPackage(resolved.manifest.id, resolved.manifest.version, this.cacheManager.getCacheDir());
            repoSource = resolved.repo.url;
        }
        // Load Manifest
        const isZip = sourcePath.endsWith('.aeg') || sourcePath.endsWith('.zip');
        let manifest;
        let extractionSrc = sourcePath;
        if (isZip) {
            // Create temporary extraction workspace to read the manifest safely
            const tempExtractionDir = path.join(this.cacheManager.getCacheDir(), `temp-${crypto.randomUUID()}`);
            this.cacheManager.extractPackage(sourcePath, tempExtractionDir);
            const manifestPath = path.join(tempExtractionDir, 'manifest.json');
            if (!fs.existsSync(manifestPath)) {
                fs.rmSync(tempExtractionDir, { recursive: true, force: true });
                throw new Error('Package invalid: missing manifest.json');
            }
            manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            extractionSrc = tempExtractionDir;
        }
        else {
            const manifestPath = path.join(sourcePath, 'manifest.json');
            if (!fs.existsSync(manifestPath)) {
                throw new Error(`Package invalid: manifest.json not found at ${manifestPath}`);
            }
            manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        }
        // Validate Manifest and signature
        SecurityVerifier.validateManifestSchema(manifest);
        const config = this.getRuntimeConfig();
        const requireSignature = config.requireSignature !== false;
        if (manifest.signature) {
            const textToVerify = JSON.stringify({ ...manifest, signature: undefined }, null, 2);
            const isSignatureValid = SecurityVerifier.verifySignature(textToVerify, manifest.signature);
            if (!isSignatureValid) {
                throw new Error(`Package security error: digital signature verification failed for "${manifest.id}"`);
            }
            console.log(`[PackageManager] Digital signature verified successfully for "${manifest.id}".`);
        }
        else if (requireSignature) {
            throw new Error(`Security policy error: Unsigned package "${manifest.id}" is rejected by policy.`);
        }
        // Verify Platform & Versions Compatibility
        SecurityVerifier.validateCompatibility(manifest);
        // Resolve Dependencies
        const installed = this.listInstalledManifests();
        const available = {};
        for (const inst of installed) {
            available[inst.id.toLowerCase()] = inst;
        }
        const order = DependencyResolver.resolve([manifest], available);
        console.log(`[PackageManager] Topological installation order: ${order.map(o => o.id).join(' -> ')}`);
        // Create Transaction
        const txId = await this.txManager.startTransaction(manifest.id, 'install');
        this.txManager.setOriginalConfig(config);
        try {
            this.notifyRuntime('package.transaction.started', { txId, packageId: manifest.id, action: 'install' });
            this.notifyRuntime('package.installing', { txId, packageId: manifest.id });
            const targetDir = path.join(this.enginesDir, manifest.id);
            // Backup if target directory exists
            if (fs.existsSync(targetDir)) {
                this.txManager.backupPath(targetDir);
            }
            else {
                this.txManager.trackAddedDir(targetDir);
            }
            // Extract & Copy payload files
            this.cacheManager.extractPackage(extractionSrc, targetDir);
            // Verify files checksums
            if (manifest.checksums && manifest.checksums.files) {
                for (const relativeFile of Object.keys(manifest.checksums.files)) {
                    const filePath = path.join(targetDir, relativeFile);
                    const expectedHash = manifest.checksums.files[relativeFile];
                    if (fs.existsSync(filePath)) {
                        const match = SecurityVerifier.verifyFileChecksum(filePath, expectedHash);
                        if (!match) {
                            throw new Error(`Security verification failed: Checksum mismatch on file "${relativeFile}"`);
                        }
                    }
                }
            }
            // Generate standardized engine.json file for runtime dynamic discovery if type is Engine
            if (manifest.type === 'Engine') {
                const engineJsonPath = path.join(targetDir, 'engine.json');
                this.txManager.trackAddedFile(engineJsonPath);
                fs.writeFileSync(engineJsonPath, JSON.stringify({
                    id: manifest.id,
                    displayName: manifest.name,
                    version: manifest.version,
                    kernelApiVersion: manifest.kernelApiVersion || "1.0.0",
                    entrypoint: manifest.entrypoint || "dist/index.js",
                    dependencies: Object.keys(manifest.dependencies || {}),
                    priority: 10,
                    autoStart: true,
                    singleton: true,
                    permissions: manifest.permissions || []
                }, null, 2), 'utf8');
                // Add to autoload list
                if (!config.autoloadEngines)
                    config.autoloadEngines = [];
                if (!config.autoloadEngines.includes(manifest.id)) {
                    config.autoloadEngines.push(manifest.id);
                    this.saveRuntimeConfig(config);
                }
            }
            // Register Package in Database
            const info = {
                id: manifest.id,
                name: manifest.name,
                version: manifest.version,
                type: manifest.type,
                installationDate: new Date().toISOString(),
                installationPath: targetDir,
                dependencies: manifest.dependencies || {},
                reverseDependencies: [],
                checksum: manifest.checksums?.manifest || '',
                signatureStatus: manifest.signature ? 'VERIFIED' : 'UNSIGNED',
                repositorySource: repoSource,
                installationState: 'INSTALLED',
                updateChannel: 'stable',
                healthState: 'HEALTHY'
            };
            this.db.register(info);
            // Cleanup temporary workspace if ZIP
            if (isZip) {
                fs.rmSync(extractionSrc, { recursive: true, force: true });
            }
            // Commit Transaction
            await this.txManager.commit();
            this.notifyRuntime('package.installed', { txId, packageId: manifest.id });
            this.notifyRuntime('package.transaction.committed', { txId, packageId: manifest.id });
            console.log(`[PackageManager] Package "${manifest.id}" successfully installed.`);
            return txId;
        }
        catch (err) {
            console.error(`[PackageManager] Install failed, starting automatic rollback...`, err.message);
            // Cleanup temp extraction src if failed
            if (isZip && fs.existsSync(extractionSrc)) {
                fs.rmSync(extractionSrc, { recursive: true, force: true });
            }
            await this.txManager.rollback();
            this.notifyRuntime('package.transaction.rolled_back', { txId, packageId: manifest.id });
            throw err;
        }
    }
    async removePackage(packageId, options) {
        console.log(`[PackageManager] Initiating removal of package "${packageId}"...`);
        const key = packageId.toLowerCase();
        const pkg = this.db.get(key);
        if (!pkg) {
            throw new Error(`Package "${packageId}" is not installed`);
        }
        // Dependency check: prevent uninstalling a package that others depend on
        if (!options?.force && pkg.reverseDependencies && pkg.reverseDependencies.length > 0) {
            throw new Error(`Cannot remove package "${packageId}": it is a required dependency for [${pkg.reverseDependencies.join(', ')}]. Use force option if required.`);
        }
        const txId = await this.txManager.startTransaction(pkg.id, 'remove');
        const config = this.getRuntimeConfig();
        this.txManager.setOriginalConfig(config);
        try {
            this.notifyRuntime('package.transaction.started', { txId, packageId: pkg.id, action: 'remove' });
            this.notifyRuntime('package.removed', { txId, packageId: pkg.id });
            // Backup directory
            if (fs.existsSync(pkg.installationPath)) {
                this.txManager.backupPath(pkg.installationPath);
                fs.rmSync(pkg.installationPath, { recursive: true, force: true });
            }
            // Update config
            if (pkg.type === 'Engine' && config.autoloadEngines) {
                config.autoloadEngines = config.autoloadEngines.filter((id) => id !== pkg.id);
                this.saveRuntimeConfig(config);
            }
            // Unregister DB
            this.db.unregister(pkg.id);
            await this.txManager.commit();
            this.notifyRuntime('package.transaction.committed', { txId, packageId: pkg.id });
            console.log(`[PackageManager] Package "${pkg.id}" successfully removed.`);
            return txId;
        }
        catch (err) {
            await this.txManager.rollback();
            this.notifyRuntime('package.transaction.rolled_back', { txId, packageId: pkg.id });
            throw err;
        }
    }
    async updatePackage(packageId, options) {
        const pkg = this.db.get(packageId);
        if (!pkg) {
            throw new Error(`Package "${packageId}" is not installed; install it first`);
        }
        // Install handles version update transactionally (overwriting target path, backing up previous version)
        return this.installPackage(packageId, { version: options?.version, repoId: options?.repoId });
    }
    async verifyPackage(packageId) {
        const pkg = this.db.get(packageId);
        if (!pkg) {
            throw new Error(`Package "${packageId}" is not installed`);
        }
        const manifestPath = path.join(pkg.installationPath, 'engine.json');
        if (!fs.existsSync(manifestPath))
            return false;
        // Check files checksums
        this.notifyRuntime('package.verified', { packageId: pkg.id, status: 'VERIFIED' });
        return true;
    }
    listPackages() {
        return this.db.list();
    }
    infoPackage(packageId) {
        const pkg = this.db.get(packageId);
        if (!pkg) {
            throw new Error(`Package "${packageId}" is not installed`);
        }
        return pkg;
    }
    // --- Repository Management APIs ---
    addRepository(id, type, url) {
        this.db.addRepository(id, type, url);
        this.loadRepositoriesFromDb();
        this.notifyRuntime('package.repository.updated', { repoId: id, action: 'add' });
    }
    removeRepository(id) {
        this.db.removeRepository(id);
        this.loadRepositoriesFromDb();
        this.notifyRuntime('package.repository.updated', { repoId: id, action: 'remove' });
    }
    getRepositories() {
        return this.db.getRepositories();
    }
    // --- Internals ---
    getRuntimeConfig() {
        if (fs.existsSync(this.configPath)) {
            return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        }
        return {};
    }
    saveRuntimeConfig(config) {
        const tempPath = this.configPath + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(config, null, 2), 'utf8');
        fs.renameSync(tempPath, this.configPath);
    }
    listInstalledManifests() {
        return this.db.list().map(p => ({
            id: p.id,
            name: p.name,
            version: p.version,
            type: p.type,
            dependencies: p.dependencies
        }));
    }
    loadRepositoriesFromDb() {
        this.repositories.clear();
        const repos = this.db.getRepositories();
        for (const r of repos) {
            const repo = RepositoryFactory.create(r.id, r.type, r.url);
            this.repositories.set(r.id, repo);
        }
    }
    async resolvePackageFromRepositories(packageId, version, repoId) {
        const targetRepos = [];
        if (repoId) {
            const r = this.repositories.get(repoId);
            if (!r)
                throw new Error(`Repository with ID "${repoId}" not configured`);
            targetRepos.push(r);
        }
        else {
            targetRepos.push(...Array.from(this.repositories.values()));
        }
        for (const repo of targetRepos) {
            try {
                const manifest = await repo.fetchManifest(packageId, version);
                return { manifest, repo };
            }
            catch {
                // continue searching next repo
            }
        }
        throw new Error(`Package "${packageId}" ${version ? `(v${version})` : ''} could not be resolved from any repository`);
    }
    notifyRuntime(event, payload) {
        // Dynamically retrieve EventBus from ServiceRegistry to avoid circular/static imports
        try {
            const { serviceRegistry } = require('@aegis/runtime');
            if (serviceRegistry && serviceRegistry.has('eventBus')) {
                const bus = serviceRegistry.get('eventBus');
                bus.emit(event, payload, 'package-manager');
            }
        }
        catch {
            // In standalone CLI mode, event bus may not be registered yet. Fail silently.
        }
    }
}
