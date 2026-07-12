import { writeMemoryFile } from './utils/MemoryFileHelpers.js';

interface BufferedWrite {
  content: string;
  resolve: () => void;
  reject: (err: Error) => void;
}

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
export class MemoryWriteBuffer {
  private static instance = new MemoryWriteBuffer();

  public static getInstance(): MemoryWriteBuffer {
    return this.instance;
  }

  // filePath → latest pending write (awaited callers are stored as a list)
  private pending = new Map<string, { content: string; waiters: Array<{ resolve: () => void; reject: (e: Error) => void }> }>();
  private flushTimer: NodeJS.Timeout | null = null;

  // ----------------------------------------------------------------
  // Public API
  // ----------------------------------------------------------------

  /**
   * Buffers a write. Returns a Promise that resolves once the content has been
   * durably written to disk (at the next flush).
   */
  public enqueue(filePath: string, content: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const existing = this.pending.get(filePath);
      if (existing) {
        // Supersede earlier content with the latest; keep all waiters
        existing.content = content;
        existing.waiters.push({ resolve, reject });
      } else {
        this.pending.set(filePath, { content, waiters: [{ resolve, reject }] });
      }
    });
  }

  /**
   * Fire-and-forget variant — buffers a write without returning a Promise.
   * Errors are silently swallowed (suitable for non-critical background writes).
   */
  public markDirty(filePath: string, content: string): void {
    const existing = this.pending.get(filePath);
    if (existing) {
      existing.content = content;
    } else {
      this.pending.set(filePath, { content, waiters: [] });
    }
  }

  /**
   * Flushes all buffered writes to disk. Returns when every write has settled.
   */
  public async flush(): Promise<void> {
    if (this.pending.size === 0) return;

    // Snapshot and clear the pending map atomically so new enqueues during
    // flush land in the next batch.
    const snapshot = new Map(this.pending);
    this.pending.clear();

    await Promise.allSettled(
      Array.from(snapshot.entries()).map(async ([filePath, { content, waiters }]) => {
        try {
          await writeMemoryFile(filePath, content);
          for (const { resolve } of waiters) resolve();
        } catch (err: any) {
          for (const { reject } of waiters) reject(err);
          throw err; // so allSettled captures it
        }
      })
    );
  }

  /**
   * Starts a background auto-flush timer.
   */
  public startAutoFlush(intervalMs = 5000): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(async () => {
      try {
        await this.flush();
      } catch {
        // Individual file errors are already dispatched to waiters
      }
    }, intervalMs);
  }

  /**
   * Stops the auto-flush timer and performs one final flush.
   */
  public async stopAutoFlush(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }

  /**
   * Returns true if there are pending writes for the given file path.
   */
  public hasPending(filePath: string): boolean {
    return this.pending.has(filePath);
  }

  /**
   * Returns the latest buffered content for a file, or null if none is pending.
   * Allows readers to get the latest version without hitting disk.
   */
  public getPending(filePath: string): string | null {
    return this.pending.get(filePath)?.content ?? null;
  }
}

export const memoryWriteBuffer = MemoryWriteBuffer.getInstance();
