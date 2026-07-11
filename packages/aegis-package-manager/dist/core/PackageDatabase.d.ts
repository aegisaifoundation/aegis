import { PackageInfo } from '../types/Manifest.js';
export declare class PackageDatabase {
    private dbPath;
    private schema;
    constructor(dbPath: string);
    getDbPath(): string;
    load(): void;
    save(): void;
    private ensureDirectoriesExist;
    addRepository(id: string, type: 'local' | 'git' | 'http' | 'offline', url: string): void;
    removeRepository(id: string): void;
    getRepositories(): {
        id: string;
        type: "local" | "git" | "http" | "offline";
        url: string;
    }[];
    get(packageId: string): PackageInfo | undefined;
    list(): PackageInfo[];
    register(info: PackageInfo): void;
    unregister(packageId: string): void;
    updatePackageState(packageId: string, updates: Partial<PackageInfo>): void;
    private rebuildReverseDependencies;
    logTransaction(txId: string, action: string, status: 'COMMITTED' | 'ROLLED_BACK' | 'FAILED'): void;
    getTransactionHistory(): {
        txId: string;
        action: string;
        timestamp: string;
        status: "COMMITTED" | "ROLLED_BACK" | "FAILED";
    }[];
}
