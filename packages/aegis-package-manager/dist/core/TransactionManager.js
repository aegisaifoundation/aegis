import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
export class TransactionManager {
    workspacePath;
    db;
    currentJournal = null;
    journalDir;
    backupDir;
    constructor(workspacePath, db) {
        this.workspacePath = workspacePath;
        this.db = db;
        this.journalDir = path.join(workspacePath, 'package-manager/transactions');
        this.backupDir = path.join(workspacePath, 'package-manager/backups');
        // Ensure transaction directories exist
        fs.mkdirSync(this.journalDir, { recursive: true });
        fs.mkdirSync(this.backupDir, { recursive: true });
    }
    async startTransaction(packageId, action) {
        if (this.currentJournal) {
            throw new Error(`Another transaction (${this.currentJournal.txId}) is already in progress`);
        }
        const txId = crypto.randomUUID();
        const journal = {
            txId,
            state: 'STARTED',
            timestamp: new Date().toISOString(),
            packageId,
            action,
            backups: [],
            addedFiles: [],
            addedDirs: [],
            originalConfig: null
        };
        this.currentJournal = journal;
        this.saveJournal(journal);
        return txId;
    }
    backupPath(originalPath) {
        if (!this.currentJournal)
            return;
        if (!fs.existsSync(originalPath))
            return;
        const txBackupRoot = path.join(this.backupDir, this.currentJournal.txId);
        fs.mkdirSync(txBackupRoot, { recursive: true });
        // Generate a unique backup subfolder/name
        const backupName = crypto.randomUUID();
        const backupPath = path.join(txBackupRoot, backupName);
        console.log(`[TransactionManager] Backing up: ${originalPath} -> ${backupPath}`);
        fs.cpSync(originalPath, backupPath, { recursive: true });
        this.currentJournal.backups.push({
            originalPath,
            backupPath
        });
        this.currentJournal.state = 'BACKED_UP';
        this.saveJournal(this.currentJournal);
    }
    trackAddedFile(filePath) {
        if (this.currentJournal && !this.currentJournal.addedFiles.includes(filePath)) {
            this.currentJournal.addedFiles.push(filePath);
            this.saveJournal(this.currentJournal);
        }
    }
    trackAddedDir(dirPath) {
        if (this.currentJournal && !this.currentJournal.addedDirs.includes(dirPath)) {
            this.currentJournal.addedDirs.push(dirPath);
            this.saveJournal(this.currentJournal);
        }
    }
    setOriginalConfig(config) {
        if (this.currentJournal) {
            this.currentJournal.originalConfig = JSON.parse(JSON.stringify(config));
            this.saveJournal(this.currentJournal);
        }
    }
    updateState(state) {
        if (this.currentJournal) {
            this.currentJournal.state = state;
            this.saveJournal(this.currentJournal);
        }
    }
    async commit() {
        if (!this.currentJournal) {
            throw new Error('No transaction in progress to commit');
        }
        console.log(`[TransactionManager] Committing transaction ${this.currentJournal.txId}...`);
        this.currentJournal.state = 'COMMITTING';
        this.saveJournal(this.currentJournal);
        // Perform backup directory cleanup
        const txBackupRoot = path.join(this.backupDir, this.currentJournal.txId);
        if (fs.existsSync(txBackupRoot)) {
            fs.rmSync(txBackupRoot, { recursive: true, force: true });
        }
        this.currentJournal.state = 'COMMITTED';
        this.saveJournal(this.currentJournal);
        this.db.logTransaction(this.currentJournal.txId, this.currentJournal.action, 'COMMITTED');
        // Clear state
        this.currentJournal = null;
    }
    async rollback() {
        if (!this.currentJournal) {
            throw new Error('No transaction in progress to rollback');
        }
        const txId = this.currentJournal.txId;
        console.warn(`[TransactionManager] Rolling back transaction ${txId}...`);
        this.currentJournal.state = 'ROLLING_BACK';
        this.saveJournal(this.currentJournal);
        try {
            // 1. Delete newly added files
            for (const addedFile of this.currentJournal.addedFiles) {
                if (fs.existsSync(addedFile)) {
                    fs.rmSync(addedFile, { force: true });
                }
            }
            // 2. Delete newly added directories (recursively if empty)
            for (const addedDir of this.currentJournal.addedDirs) {
                if (fs.existsSync(addedDir)) {
                    fs.rmSync(addedDir, { recursive: true, force: true });
                }
            }
            // 3. Restore backed up files/directories
            for (const backup of this.currentJournal.backups) {
                if (fs.existsSync(backup.originalPath)) {
                    fs.rmSync(backup.originalPath, { recursive: true, force: true });
                }
                if (fs.existsSync(backup.backupPath)) {
                    fs.cpSync(backup.backupPath, backup.originalPath, { recursive: true });
                }
            }
            // 4. Cleanup backup folder
            const txBackupRoot = path.join(this.backupDir, txId);
            if (fs.existsSync(txBackupRoot)) {
                fs.rmSync(txBackupRoot, { recursive: true, force: true });
            }
            this.currentJournal.state = 'ROLLED_BACK';
            this.saveJournal(this.currentJournal);
            this.db.logTransaction(txId, this.currentJournal.action, 'ROLLED_BACK');
            console.log(`[TransactionManager] Transaction ${txId} rolled back successfully.`);
        }
        catch (err) {
            console.error(`[TransactionManager] Rollback failed for ${txId}:`, err.message);
            this.db.logTransaction(txId, this.currentJournal.action, 'FAILED');
        }
        finally {
            this.currentJournal = null;
        }
    }
    // --- Startup Recovery API ---
    async recoverOrphanedTransactions(configPath) {
        console.log('[TransactionManager] Running first-boot transaction recovery check...');
        const files = fs.readdirSync(this.journalDir);
        for (const file of files) {
            if (file.endsWith('_journal.json')) {
                const filePath = path.join(this.journalDir, file);
                try {
                    const journal = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                    if (journal.state !== 'COMMITTED' && journal.state !== 'ROLLED_BACK') {
                        console.warn(`[TransactionManager] Orphaned transaction detected: ${journal.txId} (state: ${journal.state}). Recovering...`);
                        this.currentJournal = journal;
                        await this.rollback();
                        // Revert runtime.json autoload list to backup if possible
                        if (journal.originalConfig && fs.existsSync(configPath)) {
                            fs.writeFileSync(configPath, JSON.stringify(journal.originalConfig, null, 2), 'utf8');
                            console.log('[TransactionManager] Restored original runtime.json configurations.');
                        }
                    }
                }
                catch (e) {
                    // ignore corrupted journal parse errors
                }
            }
        }
    }
    saveJournal(journal) {
        const journalPath = path.join(this.journalDir, `${journal.txId}_journal.json`);
        const tempPath = journalPath + '.tmp';
        fs.writeFileSync(tempPath, JSON.stringify(journal, null, 2), 'utf8');
        fs.renameSync(tempPath, journalPath);
    }
}
