import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { workspaceManager } from '../../runtime/WorkspaceManager.js';
import { AuditLogEntry } from '../interfaces/MemoryTypes.js';

export class MemoryObservability {
  private static getEpisodicDir(): string {
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    return path.resolve(wsRoot, 'memory/episodic');
  }

  /**
   * Log a general runtime event into the episodic log file (events.jsonl).
   */
  public static async logEvent(event: Record<string, any>): Promise<void> {
    try {
      const episodicDir = this.getEpisodicDir();
      if (!existsSync(episodicDir)) {
        await fs.mkdir(episodicDir, { recursive: true });
      }
      const logFile = path.join(episodicDir, 'events.jsonl');
      const logLine = JSON.stringify({ timestamp: new Date().toISOString(), ...event }) + '\n';
      await fs.appendFile(logFile, logLine, 'utf8');
    } catch (err) {
      console.error('[MemoryObservability] Failed to write episodic event:', err);
    }
  }

  /**
   * Log access auditing records for security compliance and debugging (audit.jsonl).
   */
  public static async logAudit(
    actor: string,
    action: 'read' | 'write' | 'delete' | 'refine' | 'snapshot' | 'restore',
    targetType: string,
    targetId: string,
    details?: Record<string, any>
  ): Promise<void> {
    try {
      const entry: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        actor,
        action,
        targetType,
        targetId,
        details
      };
      
      const episodicDir = this.getEpisodicDir();
      if (!existsSync(episodicDir)) {
        await fs.mkdir(episodicDir, { recursive: true });
      }
      const auditFile = path.join(episodicDir, 'audit.jsonl');
      const logLine = JSON.stringify(entry) + '\n';
      await fs.appendFile(auditFile, logLine, 'utf8');
    } catch (err) {
      console.error('[MemoryObservability] Failed to write audit log:', err);
    }
  }
}
