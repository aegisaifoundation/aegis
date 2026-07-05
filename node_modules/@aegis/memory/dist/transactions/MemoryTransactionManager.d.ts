export declare class MemoryTransactionManager {
    private activeOperations;
    /**
     * Starts a transaction scope for a specific session or orchestration flow.
     */
    beginTransaction(transactionId: string): void;
    /**
     * Queues a write operation. Backs up original content first.
     */
    registerWrite(transactionId: string, filePath: string, newContent: string): Promise<void>;
    /**
     * Commits the transaction by writing all queued files.
     * Triggers rollback automatically on failure.
     */
    commitTransaction(transactionId: string): Promise<void>;
    /**
     * Aborts the transaction and rolls back any modified files to their original states.
     */
    rollbackTransaction(transactionId: string): Promise<void>;
}
export declare const memoryTransactionManager: MemoryTransactionManager;
