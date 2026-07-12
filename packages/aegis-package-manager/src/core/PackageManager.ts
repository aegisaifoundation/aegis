import fs from 'fs';
import path from 'path';
import { PackageManifest, PackageInfo } from '../types/Manifest.js';
import { PackageDatabase } from './PackageDatabase.js';
import { TransactionManager } from './TransactionManager.js';
import { DependencyResolver } from './DependencyResolver.js';
import { SecurityVerifier } from './SecurityVerifier.js';
import { CacheManager } from './CacheManager.js';
import { IRepository, RepositoryFactory } from '../repositories/Repository.js';

export class PackageManager {
  private db: PackageDatabase;
  private txManager: TransactionManager;
  private cacheManager: CacheManager;
  private repositories: Map<string, IRepository> = new Map();

  constructor(private configPath: string, private enginesDir: string) {
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
    this.txManager.recoverOrphanedTransactions(configPath).then(async () => {
      await this.syncRegistry();
    }).catch(err => {
      console.error('[PackageManager] Transaction recovery failed:', err.message);
    });
  }

  // --- Public APIs ---
  public async installPackage(packagePathOrId: string, options?: { version?: string; repoId?: string; force?: boolean }): Promise<string> {
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
    let manifest: PackageManifest;
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
    } else {
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
      // Reconstruct manifest exactly as it was at sign time:
      // The builder signs before setting checksums.manifest and before setting signature.
      // So we must strip both fields to reproduce the signed payload.
      const manifestForVerification = {
        ...manifest,
        signature: undefined,
        checksums: manifest.checksums
          ? { ...manifest.checksums, manifest: '' }
          : manifest.checksums
      };
      const textToVerify = JSON.stringify(manifestForVerification, null, 2);
      const isSignatureValid = SecurityVerifier.verifySignature(textToVerify, manifest.signature);
      if (!isSignatureValid) {
        throw new Error(`Package security error: digital signature verification failed for "${manifest.id}"`);
      }
      console.log(`[PackageManager] Digital signature verified successfully for "${manifest.id}".`);
    } else if (requireSignature) {
      throw new Error(`Security policy error: Unsigned package "${manifest.id}" is rejected by policy.`);
    }

    // Verify Platform & Versions Compatibility
    SecurityVerifier.validateCompatibility(manifest);

    // Resolve Dependencies
    const installed = this.listInstalledManifests();
    const available: Record<string, PackageManifest> = {};
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
      } else {
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
        if (!config.autoloadEngines) config.autoloadEngines = [];
        if (!config.autoloadEngines.includes(manifest.id)) {
          config.autoloadEngines.push(manifest.id);
          this.saveRuntimeConfig(config);
        }
      }

      // Register Package in Database
      const info: PackageInfo = {
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
        healthState: 'HEALTHY',
        enabled: true
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
      if (manifest.type === 'Engine') {
        this.notifyRuntime('RuntimeRegistryUpdated', { action: 'install', engineId: manifest.id });
      }
      await this.syncRegistry();
      
      console.log(`[PackageManager] Package "${manifest.id}" successfully installed.`);
      return txId;
    } catch (err: any) {
      console.error(`[PackageManager] Install failed, starting automatic rollback...`, err.message);
      
      // Cleanup temp extraction src if failed
      if (isZip && fs.existsSync(extractionSrc)) {
        fs.rmSync(extractionSrc, { recursive: true, force: true });
      }

      await this.txManager.rollback();
      await this.syncRegistry();
      this.notifyRuntime('package.transaction.rolled_back', { txId, packageId: manifest.id });
      throw err;
    }
  }

  public async removePackage(packageId: string, options?: { force?: boolean }): Promise<string> {
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
        config.autoloadEngines = config.autoloadEngines.filter((id: string) => id !== pkg.id);
        this.saveRuntimeConfig(config);
      }

      // Unregister DB
      this.db.unregister(pkg.id);

      await this.txManager.commit();
      this.notifyRuntime('package.transaction.committed', { txId, packageId: pkg.id });
      if (pkg.type === 'Engine') {
        this.notifyRuntime('RuntimeRegistryUpdated', { action: 'remove', engineId: pkg.id });
      }
      await this.syncRegistry();

      console.log(`[PackageManager] Package "${pkg.id}" successfully removed.`);
      return txId;
    } catch (err: any) {
      await this.txManager.rollback();
      await this.syncRegistry();
      this.notifyRuntime('package.transaction.rolled_back', { txId, packageId: pkg.id });
      throw err;
    }
  }

  public async updatePackage(packageId: string, options?: { version?: string; repoId?: string }): Promise<string> {
    const pkg = this.db.get(packageId);
    if (!pkg) {
      throw new Error(`Package "${packageId}" is not installed; install it first`);
    }
    
    // Install handles version update transactionally (overwriting target path, backing up previous version)
    return this.installPackage(packageId, { version: options?.version, repoId: options?.repoId });
  }

  public async verifyPackage(packageId: string): Promise<boolean> {
    const pkg = this.db.get(packageId);
    if (!pkg) {
      throw new Error(`Package "${packageId}" is not installed`);
    }

    const manifestPath = path.join(pkg.installationPath, 'engine.json');
    if (!fs.existsSync(manifestPath)) return false;

    // Check files checksums
    this.notifyRuntime('package.verified', { packageId: pkg.id, status: 'VERIFIED' });
    return true;
  }

  public listPackages(): PackageInfo[] {
    return this.db.list();
  }

  public infoPackage(packageId: string): PackageInfo {
    const pkg = this.db.get(packageId);
    if (!pkg) {
      throw new Error(`Package "${packageId}" is not installed`);
    }
    return pkg;
  }

  // --- Repository Management APIs ---
  public addRepository(id: string, type: 'local' | 'git' | 'http' | 'offline', url: string): void {
    this.db.addRepository(id, type, url);
    this.loadRepositoriesFromDb();
    this.notifyRuntime('package.repository.updated', { repoId: id, action: 'add' });
  }

  public removeRepository(id: string): void {
    this.db.removeRepository(id);
    this.loadRepositoriesFromDb();
    this.notifyRuntime('package.repository.updated', { repoId: id, action: 'remove' });
  }

  public getRepositories() {
    return this.db.getRepositories();
  }

  // --- Internals ---
  private getRuntimeConfig(): any {
    if (fs.existsSync(this.configPath)) {
      return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
    }
    return {};
  }

  private saveRuntimeConfig(config: any): void {
    const tempPath = this.configPath + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(config, null, 2), 'utf8');
    fs.renameSync(tempPath, this.configPath);
  }

  private listInstalledManifests(): PackageManifest[] {
    return this.db.list().map(p => ({
      id: p.id,
      name: p.name,
      version: p.version,
      type: p.type,
      dependencies: p.dependencies
    }));
  }

  private loadRepositoriesFromDb(): void {
    this.repositories.clear();
    const repos = this.db.getRepositories();
    for (const r of repos) {
      const repo = RepositoryFactory.create(r.id, r.type, r.url);
      this.repositories.set(r.id, repo);
    }
  }

  private async resolvePackageFromRepositories(
    packageId: string, 
    version?: string, 
    repoId?: string
  ): Promise<{ manifest: PackageManifest; repo: IRepository }> {
    const targetRepos: IRepository[] = [];
    
    if (repoId) {
      const r = this.repositories.get(repoId);
      if (!r) throw new Error(`Repository with ID "${repoId}" not configured`);
      targetRepos.push(r);
    } else {
      targetRepos.push(...Array.from(this.repositories.values()));
    }

    for (const repo of targetRepos) {
      try {
        const manifest = await repo.fetchManifest(packageId, version);
        return { manifest, repo };
      } catch {
        // continue searching next repo
      }
    }

    throw new Error(`Package "${packageId}" ${version ? `(v${version})` : ''} could not be resolved from any repository`);
  }

  private notifyRuntime(event: string, payload: any): void {
    // Dynamically retrieve EventBus from ServiceRegistry to avoid circular/static imports
    try {
      const { serviceRegistry } = require('@aegis/runtime');
      if (serviceRegistry && serviceRegistry.has('eventBus')) {
        const bus = serviceRegistry.get('eventBus');
        bus.emit(event, payload, 'package-manager');
      }
    } catch {
      // In standalone CLI mode, event bus may not be registered yet. Fail silently.
    }
  }

  public async enableEngine(engineId: string): Promise<void> {
    const pkg = this.db.get(engineId);
    if (!pkg) {
      throw new Error(`Package "${engineId}" is not installed`);
    }
    if (pkg.type !== 'Engine') {
      throw new Error(`Package "${engineId}" is not an Engine`);
    }

    this.db.updatePackageState(engineId, { enabled: true });
    this.notifyRuntime('RuntimeRegistryUpdated', { action: 'enable', engineId: pkg.id });
    await this.syncRegistry();
  }

  public async disableEngine(engineId: string): Promise<void> {
    const pkg = this.db.get(engineId);
    if (!pkg) {
      throw new Error(`Package "${engineId}" is not installed`);
    }
    if (pkg.type !== 'Engine') {
      throw new Error(`Package "${engineId}" is not an Engine`);
    }

    this.db.updatePackageState(engineId, { enabled: false });
    this.notifyRuntime('RuntimeRegistryUpdated', { action: 'disable', engineId: pkg.id });
    await this.syncRegistry();
  }

  public listEngines(): any[] {
    const registryPath = path.join(this.getWorkspacePath(), 'registry', 'engines.json');
    if (!fs.existsSync(registryPath)) {
      return [];
    }
    try {
      const data = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      return data.engines || [];
    } catch {
      return [];
    }
  }

  private getRepositoryRoot(startDir: string): string {
    let current = path.resolve(startDir);
    const seen = new Set<string>();
    while (true) {
      const packageJson = path.join(current, 'package.json');
      if (fs.existsSync(packageJson)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
          if (pkg.name === 'aegis-monorepo') {
            return current;
          }
        } catch (e) {}
      }
      const parent = path.dirname(current);
      if (parent === current || seen.has(parent)) {
        break;
      }
      seen.add(current);
      current = parent;
    }
    return process.cwd();
  }

  private getWorkspacePath(): string {
    if (process.env.AEGIS_WORKSPACE_ROOT) {
      return path.resolve(process.env.AEGIS_WORKSPACE_ROOT);
    }
    const config = this.getRuntimeConfig();
    if (config.workspace) {
      return path.resolve(path.dirname(this.configPath), config.workspace);
    }
    if (config.workspaceRoot) {
      return path.resolve(path.dirname(this.configPath), config.workspaceRoot);
    }
    const configDir = path.dirname(this.configPath);
    if (configDir.includes('test-pm-sandbox') || configDir.includes('-sandbox')) {
      return path.join(path.dirname(configDir), 'workspace');
    }
    const repoRoot = this.getRepositoryRoot(configDir);
    return path.join(repoRoot, 'workspace');
  }

  private async syncRegistry(): Promise<void> {
    const workspacePath = this.getWorkspacePath();
    const registryDir = path.join(workspacePath, 'registry');
    const registryPath = path.join(registryDir, 'engines.json');
    const historyDir = path.join(registryDir, 'history');

    if (!fs.existsSync(registryDir)) {
      fs.mkdirSync(registryDir, { recursive: true });
    }
    if (!fs.existsSync(historyDir)) {
      fs.mkdirSync(historyDir, { recursive: true });
    }

    const reservedFiles = ['packages.json', 'runtime.json', 'sessions.json'];
    for (const file of reservedFiles) {
      const reservedPath = path.join(registryDir, file);
      if (!fs.existsSync(reservedPath)) {
        fs.writeFileSync(reservedPath, JSON.stringify({ version: '1.0.0', reserved: true }, null, 2), 'utf8');
      }
    }

    const allPkgs = this.db.list();
    const engines = allPkgs.filter(pkg => pkg.type === 'Engine');
    const repoRoot = this.getRepositoryRoot(path.dirname(this.configPath));

    const registryEntries = engines.map(pkg => {
      let manifestEntry = 'dist/index.js';
      const manifestPath = path.join(pkg.installationPath, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const rawManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          if (rawManifest.entrypoint) {
            manifestEntry = rawManifest.entrypoint;
          }
        } catch {}
      }

      const relativeEntry = path.relative(repoRoot, path.join(pkg.installationPath, manifestEntry)).replace(/\\/g, '/');
      const relativeManifest = path.relative(repoRoot, path.join(pkg.installationPath, 'engine.json')).replace(/\\/g, '/');

      let runtimeApi = '1.0.0';
      let sdkVersion = '1.0.0';
      if (fs.existsSync(manifestPath)) {
        try {
          const rawManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          if (rawManifest.kernelApiVersion) {
            runtimeApi = rawManifest.kernelApiVersion;
          }
          if (rawManifest.sdkVersion) {
            sdkVersion = rawManifest.sdkVersion;
          }
        } catch {}
      }

      return {
        id: pkg.id,
        displayName: pkg.name,
        version: pkg.version,
        enabled: pkg.enabled !== false,
        entry: relativeEntry,
        manifest: relativeManifest,
        runtimeApi,
        sdkVersion,
        installedAt: pkg.installationDate
      };
    });

    const registryContent = {
      version: '1.0.0',
      generatedBy: '@aegis/package-manager',
      generatedAt: new Date().toISOString(),
      engines: registryEntries
    };

    const registryStr = JSON.stringify(registryContent, null, 2);
    const tempRegistryPath = registryPath + '.tmp';
    fs.writeFileSync(tempRegistryPath, registryStr, 'utf8');
    fs.renameSync(tempRegistryPath, registryPath);

    const timestamp = Date.now();
    const snapshotPath = path.join(historyDir, `engines_${timestamp}.json`);
    fs.writeFileSync(snapshotPath, registryStr, 'utf8');
  }
}
