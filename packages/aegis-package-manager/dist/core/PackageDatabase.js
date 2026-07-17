import fs from 'fs';
import path from 'path';
export class PackageDatabase {
    dbPath;
    enginesDir;
    schema = {
        packages: {},
        repositories: [],
        transactionHistory: []
    };
    constructor(dbPath, enginesDir) {
        this.dbPath = dbPath;
        this.enginesDir = enginesDir;
        this.load();
    }
    getDbPath() {
        return this.dbPath;
    }
    load() {
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
            // Resolve relative paths back to absolute
            if (this.enginesDir) {
                for (const key of Object.keys(this.schema.packages)) {
                    const pkg = this.schema.packages[key];
                    if (pkg.installationPath && !path.isAbsolute(pkg.installationPath)) {
                        pkg.installationPath = path.resolve(this.enginesDir, pkg.installationPath);
                    }
                }
            }
        }
        catch {
            console.warn(`[PackageDatabase] Database file corrupted, initializing fresh registry.`);
            this.schema = { packages: {}, repositories: [], transactionHistory: [] };
            this.save();
        }
    }
    save() {
        this.ensureDirectoriesExist();
        // Create a clone of the schema to avoid mutating the in-memory object
        const schemaToSave = JSON.parse(JSON.stringify(this.schema));
        if (this.enginesDir) {
            for (const key of Object.keys(schemaToSave.packages)) {
                const pkg = schemaToSave.packages[key];
                if (pkg.installationPath && path.isAbsolute(pkg.installationPath)) {
                    pkg.installationPath = path.relative(this.enginesDir, pkg.installationPath).replace(/\\/g, '/');
                }
            }
        }
        const tempPath = this.dbPath + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(schemaToSave, null, 2), 'utf8');
        fs.renameSync(tempPath, this.dbPath);
    }
    ensureDirectoriesExist() {
        const parentDir = path.dirname(this.dbPath);
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }
    }
    // --- Repository APIs ---
    addRepository(id, type, url) {
        const exists = this.schema.repositories.some(r => r.id === id);
        if (exists) {
            throw new Error(`Repository with ID "${id}" already exists`);
        }
        this.schema.repositories.push({ id, type, url });
        this.save();
    }
    removeRepository(id) {
        this.schema.repositories = this.schema.repositories.filter(r => r.id !== id);
        this.save();
    }
    getRepositories() {
        return this.schema.repositories;
    }
    // --- Package APIs ---
    get(packageId) {
        return this.schema.packages[packageId.toLowerCase()];
    }
    list() {
        return Object.values(this.schema.packages);
    }
    register(info) {
        const key = info.id.toLowerCase();
        this.schema.packages[key] = info;
        // Recalculate reverse dependencies for all packages
        this.rebuildReverseDependencies();
        this.save();
    }
    unregister(packageId) {
        const key = packageId.toLowerCase();
        delete this.schema.packages[key];
        this.rebuildReverseDependencies();
        this.save();
    }
    updatePackageState(packageId, updates) {
        const key = packageId.toLowerCase();
        const pkg = this.schema.packages[key];
        if (pkg) {
            this.schema.packages[key] = { ...pkg, ...updates };
            this.save();
        }
    }
    rebuildReverseDependencies() {
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
    logTransaction(txId, action, status) {
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
    getTransactionHistory() {
        return this.schema.transactionHistory;
    }
}
