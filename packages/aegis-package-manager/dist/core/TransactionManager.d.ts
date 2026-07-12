import { TransactionJournal } from '../types/Manifest.js';
import { PackageDatabase } from './PackageDatabase.js';
export declare class TransactionManager {
    private workspacePath;
    private db;
    private currentJournal;
    private journalDir;
    private backupDir;
    constructor(workspacePath: string, db: PackageDatabase);
    startTransaction(packageId: string, action: 'install' | 'remove' | 'update'): Promise<string>;
    backupPath(originalPath: string): void;
    trackAddedFile(filePath: string): void;
    trackAddedDir(dirPath: string): void;
    setOriginalConfig(config: any): void;
    updateState(state: TransactionJournal['state']): void;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    recoverOrphanedTransactions(configPath: string): Promise<void>;
    private saveJournal;
}
