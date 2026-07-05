import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { workspaceManager, eventBus } from '@aegis/runtime';
import { safeJsonRead, safeJsonWrite } from '../utils/MemoryFileHelpers.js';
import { SessionMetadata } from '../interfaces/MemoryTypes.js';

export class MemoryCleanupScheduler {
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Starts the background cleanup scheduler loop.
   */
  public start(intervalMs: number = 300000): void { // Default to every 5 minutes
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      this.tick().catch(err => {
        console.error('[MemoryCleanupScheduler] Background cleanup tick failed:', err);
      });
    }, intervalMs);
  }

  /**
   * Stops the background cleanup scheduler.
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Performs periodic session analysis, archiving, and snapshot pruning.
   */
  public async tick(): Promise<void> {
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    const sessionsDir = path.resolve(wsRoot, 'memory/sessions');
    const snapshotDir = path.resolve(wsRoot, 'memory/snapshots');

    if (!existsSync(sessionsDir)) return;

    try {
      const sessionFolders = await fs.readdir(sessionsDir);
      for (const sessionId of sessionFolders) {
        
        // 1. Snapshot pruning: Keep only the 5 most recent snapshots per session
        const sessionSnapDir = path.join(snapshotDir, sessionId);
        if (existsSync(sessionSnapDir)) {
          const snapFiles = await fs.readdir(sessionSnapDir);
          const snaps = snapFiles.filter(f => f.endsWith('.snap')).sort();
          if (snaps.length > 5) {
            const deleteCount = snaps.length - 5;
            for (let i = 0; i < deleteCount; i++) {
              const fileToDelete = path.join(sessionSnapDir, snaps[i]);
              await fs.unlink(fileToDelete).catch(() => {});
            }
          }
        }

        // 2. Session auto-archiving: Archive active sessions inactive for over 30 days
        const metadataPath = path.join(sessionsDir, sessionId, 'metadata.json');
        if (existsSync(metadataPath)) {
          const meta = await safeJsonRead<SessionMetadata | null>(metadataPath, null);
          if (meta) {
            const lastAccess = new Date(meta.lastAccessedAt).getTime();
            const ageMs = Date.now() - lastAccess;
            const thirtyDays = 30 * 24 * 60 * 60 * 1000;
            
            if (ageMs > thirtyDays && meta.lifecycleState === 'ACTIVE') {
              meta.lifecycleState = 'ARCHIVED' as any;
              meta.updatedAt = new Date().toISOString();
              await safeJsonWrite(metadataPath, meta);
              eventBus.emit('session.archived', { sessionId }, 'memory-system');
            }
          }
        }
      }
    } catch (err) {
      console.error('[MemoryCleanupScheduler] Error during session/snapshot cleanup:', err);
    }
  }
}

export const memoryCleanupScheduler = new MemoryCleanupScheduler();
