import fs from 'fs';
import path from 'path';
import { IStorageAdapter } from './IStorageAdapter.js';
import { StateError, StateErrorCode } from '@aegis/sdk';

export class FileStorageAdapter implements IStorageAdapter {
  private cache = new Map<string, any>();
  private readonly filePath: string;
  private readonly tempPath: string;

  constructor(baseDir: string = '.aegis/state') {
    const resolvedDir = path.isAbsolute(baseDir) ? baseDir : path.resolve(process.cwd(), baseDir);
    this.filePath = path.join(resolvedDir, 'state.json');
    this.tempPath = path.join(resolvedDir, 'state.tmp');
  }

  async initialize(): Promise<void> {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Clean up interrupted temp files on startup
    if (fs.existsSync(this.tempPath)) {
      console.warn('[AEGIS State] Cleaning up interrupted temporary file on startup:', this.tempPath);
      try {
        fs.unlinkSync(this.tempPath);
      } catch (err: any) {
        console.error('[AEGIS State] Failed to clean up temp file:', err.message);
      }
    }

    // Restore persistent state file
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        if (raw.trim().length > 0) {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === 'object') {
            for (const [k, v] of Object.entries(parsed)) {
              this.cache.set(k, v);
            }
            console.log(`[AEGIS State] Restored ${this.cache.size} state record(s) from ${this.filePath}`);
          }
        }
      } catch (err: any) {
        console.error(`[AEGIS State] CORRUPTION DETECTED in state file "${this.filePath}": ${err.message}`);
        // Quarantine corrupted file to preserve diagnostic
        const corruptPath = `${this.filePath}.corrupt-${Date.now()}`;
        try {
          fs.renameSync(this.filePath, corruptPath);
          console.warn(`[AEGIS State] Quarantined corrupted state file to "${corruptPath}"`);
        } catch (qErr: any) {
          console.error('[AEGIS State] Failed to quarantine corrupted state file:', qErr.message);
        }
      }
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    return this.cache.get(key);
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.cache.set(key, value);
    await this.flushToDisk();
  }

  async delete(key: string): Promise<void> {
    if (this.cache.delete(key)) {
      await this.flushToDisk();
    }
  }

  async has(key: string): Promise<boolean> {
    return this.cache.has(key);
  }

  async list(prefix?: string): Promise<string[]> {
    const keys = Array.from(this.cache.keys());
    if (!prefix) return keys;
    return keys.filter(k => k.startsWith(prefix));
  }

  async close(): Promise<void> {
    await this.flushToDisk();
    this.cache.clear();
  }

  private async flushToDisk(): Promise<void> {
    try {
      const obj: Record<string, any> = {};
      for (const [k, v] of this.cache.entries()) {
        obj[k] = v;
      }
      const data = JSON.stringify(obj, null, 2);

      // Step 1: Write to temporary file
      fs.writeFileSync(this.tempPath, data, 'utf-8');

      // Step 2: Atomic rename/replace
      fs.renameSync(this.tempPath, this.filePath);
    } catch (err: any) {
      throw new StateError(
        StateErrorCode.STATE_STORAGE_FAILURE,
        `Failed atomic file flush to disk: ${err.message}`,
        { filePath: this.filePath, error: err.message }
      );
    }
  }
}
