/**
 * MemoryLockManager prevents concurrent execution conflicts on session resources.
 * It uses a Promise-based mutex queue keyed by sessionId.
 */
export declare class MemoryLockManager {
    private static instance;
    private locks;
    static getInstance(): MemoryLockManager;
    /**
     * Acquires a lock for a given sessionId.
     * Returns a release function that must be called when the operation is complete.
     */
    acquire(sessionId: string): Promise<() => void>;
    /**
     * Checks if a session is currently locked.
     */
    isLocked(sessionId: string): boolean;
}
export declare const memoryLockManager: MemoryLockManager;
