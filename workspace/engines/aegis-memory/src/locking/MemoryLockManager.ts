/**
 * MemoryLockManager prevents concurrent execution conflicts on session resources.
 * It uses a Promise-based mutex queue keyed by sessionId.
 */
export class MemoryLockManager {
  private static instance = new MemoryLockManager();
  private locks = new Map<string, Promise<void>>();

  public static getInstance(): MemoryLockManager {
    return this.instance;
  }

  /**
   * Acquires a lock for a given sessionId.
   * Returns a release function that must be called when the operation is complete.
   */
  async acquire(sessionId: string): Promise<() => void> {
    const currentPromise = this.locks.get(sessionId) || Promise.resolve();
    let releaseLock: () => void = () => {};
    
    const newPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    // Queue the new lock behind the current active lock
    this.locks.set(sessionId, currentPromise.then(() => newPromise));

    // Wait for the previous lock in the queue to resolve
    await currentPromise;

    return () => {
      releaseLock();
      // Remove from map if we are still the tail of the lock chain
      if (this.locks.get(sessionId) === newPromise) {
        this.locks.delete(sessionId);
      }
    };
  }

  /**
   * Checks if a session is currently locked.
   */
  isLocked(sessionId: string): boolean {
    return this.locks.has(sessionId);
  }
}

export const memoryLockManager = MemoryLockManager.getInstance();
