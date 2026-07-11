import fs from 'fs';
import path from 'path';
import { PackageDatabaseSchema, PackageInfo } from '../types/Manifest.js';

export class PackageDatabase {
  private schema: PackageDatabaseSchema = {
    packages: {},
    repositories: [],
    transactionHistory: []
  };

  constructor(private dbPath: string) {
    this.load();
  }

  public getDbPath(): string {
    return this.dbPath;
  }

  public load(): void {
    if (!fs.existsSync(this.dbPath)) {
      this.ensureDirectoriesExist();
      this.save();
      return;
    }
    try {
      const dataText = fs.readFileSync(this.dbPath, 'utf8');
      this.schema = JSON.parse(dataText);
      // Ensure all fields are initialized
      this.schema.packages = this.schema.packages || {};
      this.schema.repositories = this.schema.repositories || [];
      this.schema.transactionHistory = this.schema.transactionHistory || [];
    } catch {
      console.warn(`[PackageDatabase] Database file corrupted, initializing fresh registry.`);
      this.schema = { packages: {}, repositories: [], transactionHistory: [] };
      this.save();
    }
  }

  public save(): void {
    this.ensureDirectoriesExist();
    const tempPath = this.dbPath + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(this.schema, null, 2), 'utf8');
    fs.renameSync(tempPath, this.dbPath);
  }

  private ensureDirectoriesExist(): void {
    const parentDir = path.dirname(this.dbPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
  }

  // --- Repository APIs ---
  public addRepository(id: string, type: 'local' | 'git' | 'http' | 'offline', url: string): void {
    const exists = this.schema.repositories.some(r => r.id === id);
    if (exists) {
      throw new Error(`Repository with ID "${id}" already exists`);
    }
    this.schema.repositories.push({ id, type, url });
    this.save();
  }

  public removeRepository(id: string): void {
    this.schema.repositories = this.schema.repositories.filter(r => r.id !== id);
    this.save();
  }

  public getRepositories() {
    return this.schema.repositories;
  }

  // --- Package APIs ---
  public get(packageId: string): PackageInfo | undefined {
    return this.schema.packages[packageId.toLowerCase()];
  }

  public list(): PackageInfo[] {
    return Object.values(this.schema.packages);
  }

  public register(info: PackageInfo): void {
    const key = info.id.toLowerCase();
    this.schema.packages[key] = info;

    // Recalculate reverse dependencies for all packages
    this.rebuildReverseDependencies();
    this.save();
  }

  public unregister(packageId: string): void {
    const key = packageId.toLowerCase();
    delete this.schema.packages[key];
    this.rebuildReverseDependencies();
    this.save();
  }

  public updatePackageState(packageId: string, updates: Partial<PackageInfo>): void {
    const key = packageId.toLowerCase();
    const pkg = this.schema.packages[key];
    if (pkg) {
      this.schema.packages[key] = { ...pkg, ...updates };
      this.save();
    }
  }

  private rebuildReverseDependencies(): void {
    // Reset all reverse dependencies
    for (const key of Object.keys(this.schema.packages)) {
      this.schema.packages[key].reverseDependencies = [];
    }

    // Map each package dependency to target's reverseDependencies list
    for (const key of Object.keys(this.schema.packages)) {
      const pkg = this.schema.packages[key];
      for (const depId of Object.keys(pkg.dependencies)) {
        const depKey = depId.toLowerCase();
        if (this.schema.packages[depKey]) {
          const revDeps = this.schema.packages[depKey].reverseDependencies;
          if (!revDeps.includes(pkg.id)) {
            revDeps.push(pkg.id);
          }
        }
      }
    }
  }

  // --- Transaction APIs ---
  public logTransaction(txId: string, action: string, status: 'COMMITTED' | 'ROLLED_BACK' | 'FAILED'): void {
    this.schema.transactionHistory.push({
      txId,
      action,
      timestamp: new Date().toISOString(),
      status
    });
    // Cap log history size
    if (this.schema.transactionHistory.length > 100) {
      this.schema.transactionHistory.shift();
    }
    this.save();
  }

  public getTransactionHistory() {
    return this.schema.transactionHistory;
  }
}
