/**
 * MemoryWriteBuffer — a per-file write buffer that coalesces rapid successive writes.
 *
 * Semantics:
 * - Multiple pending writes to the same file path are deduplicated: only the
 *   latest content is retained when the flush executes.
 * - `flush()` writes all pending entries atomically (sequential per file) and
 *   resolves/rejects all waiters.
 * - `markDirty()` is a fire-and-forget variant for callers that do not need to
 *   await the write (e.g. audit logs, background metadata updates).
 * - A `setInterval`-based auto-flush runs every `autoFlushMs` milliseconds
 *   (default: 5 000 ms). Call `startAutoFlush()` / `stopAutoFlush()` to control it.
 */
export declare class MemoryWriteBuffer {
    private static instance;
    static getInstance(): MemoryWriteBuffer;
    private pending;
    private flushTimer;
    /**
     * Buffers a write. Returns a Promise that resolves once the content has been
     * durably written to disk (at the next flush).
     */
    enqueue(filePath: string, content: string): Promise<void>;
    /**
     * Fire-and-forget variant — buffers a write without returning a Promise.
     * Errors are silently swallowed (suitable for non-critical background writes).
     */
    markDirty(filePath: string, content: string): void;
    /**
     * Flushes all buffered writes to disk. Returns when every write has settled.
     */
    flush(): Promise<void>;
    /**
     * Starts a background auto-flush timer.
     */
    startAutoFlush(intervalMs?: number): void;
    /**
     * Stops the auto-flush timer and performs one final flush.
     */
    stopAutoFlush(): Promise<void>;
    /**
     * Returns true if there are pending writes for the given file path.
     */
    hasPending(filePath: string): boolean;
    /**
     * Returns the latest buffered content for a file, or null if none is pending.
     * Allows readers to get the latest version without hitting disk.
     */
    getPending(filePath: string): string | null;
}
export declare const memoryWriteBuffer: MemoryWriteBuffer;
