import { readMemoryFile, writeMemoryFile } from '../utils/MemoryFileHelpers.js';
import fs from 'fs/promises';
export class MemoryTransactionManager {
    activeOperations = new Map();
    /**
     * Starts a transaction scope for a specific session or orchestration flow.
     */
    beginTransaction(transactionId) {
        if (this.activeOperations.has(transactionId)) {
            throw new Error(`Transaction ${transactionId} is already active.`);
        }
        this.activeOperations.set(transactionId, []);
    }
    /**
     * Queues a write operation. Backs up original content first.
     */
    async registerWrite(transactionId, filePath, newContent) {
        const ops = this.activeOperations.get(transactionId);
        if (!ops) {
            throw new Error(`Transaction ${transactionId} is not active.`);
        }
        // Check if we already backed up this file in this transaction
        const existingOp = ops.find(o => o.filePath === filePath);
        if (existingOp) {
            existingOp.newContent = newContent;
            return;
        }
        let previousContent = null;
        try {
            const raw = await readMemoryFile(filePath);
            previousContent = raw || null;
        }
        catch {
            previousContent = null;
        }
        ops.push({
            filePath,
            previousContent,
            newContent
        });
    }
    /**
     * Commits the transaction by writing all queued files.
     * Triggers rollback automatically on failure.
     */
    async commitTransaction(transactionId) {
        const ops = this.activeOperations.get(transactionId);
        if (!ops) {
            throw new Error(`Transaction ${transactionId} is not active.`);
        }
        try {
            for (const op of ops) {
                await writeMemoryFile(op.filePath, op.newContent);
            }
        }
        catch (err) {
            console.error(`[MemoryTransactionManager] Commit failed on transaction ${transactionId}, rolling back.`, err);
            await this.rollbackTransaction(transactionId);
            throw err;
        }
        finally {
            this.activeOperations.delete(transactionId);
        }
    }
    /**
     * Aborts the transaction and rolls back any modified files to their original states.
     */
    async rollbackTransaction(transactionId) {
        const ops = this.activeOperations.get(transactionId);
        if (!ops) {
            return;
        }
        for (const op of ops.reverse()) {
            try {
                if (op.previousContent === null) {
                    await fs.unlink(op.filePath).catch(() => { });
                }
                else {
                    await writeMemoryFile(op.filePath, op.previousContent);
                }
            }
            catch (err) {
                console.error(`[MemoryTransactionManager] Failed to restore file ${op.filePath} during rollback:`, err);
            }
        }
        this.activeOperations.delete(transactionId);
    }
}
export const memoryTransactionManager = new MemoryTransactionManager();
