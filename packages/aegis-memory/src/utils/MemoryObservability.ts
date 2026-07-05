import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { workspaceManager } from '@aegis/runtime';
import { AuditLogEntry } from '../interfaces/MemoryTypes.js';

// ── Module-level dir existence cache ──────────────────────────────
let episodicDirPath: string | null = null;
let episodicDirEnsured = false;

// ── In-memory write buffers ────────────────────────────────────────
const auditBuffer: string[] = [];
const eventBuffer: string[] = [];
const FLUSH_THRESHOLD = 50;

function getEpisodicDir(): string {
  if (!episodicDirPath) {
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    episodicDirPath = path.resolve(wsRoot, 'memory/episodic');
  }
  return episodicDirPath;
}

function ensureEpisodicDir(): void {
  if (episodicDirEnsured) return;
  const dir = getEpisodicDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  episodicDirEnsured = true;
}

async function flushBuffer(buffer: string[], filePath: string): Promise<void> {
  if (buffer.length === 0) return;
  const content = buffer.splice(0, buffer.length).join('');
  try {
    await fs.appendFile(filePath, content, 'utf8');
  } catch (err) {
    console.error('[MemoryObservability] Failed to flush log buffer:', err);
  }
}

// Auto-flush every 5 seconds
let flushTimer: NodeJS.Timeout | null = null;

function startFlushTimer(): void {
  if (flushTimer) return;
  flushTimer = setInterval(async () => {
    if (!episodicDirEnsured) return;
    const dir = getEpisodicDir();
    if (auditBuffer.length > 0) {
      await flushBuffer(auditBuffer, path.join(dir, 'audit.jsonl'));
    }
    if (eventBuffer.length > 0) {
      await flushBuffer(eventBuffer, path.join(dir, 'events.jsonl'));
    }
  }, 5000);
}

export class MemoryObservability {
  /**
   * Log a general runtime event into the episodic log file (events.jsonl).
   * Fire-and-forget — never awaited in the hot path.
   */
  public static logEvent(event: Record<string, any>): void {
    try {
      ensureEpisodicDir();
      startFlushTimer();
      const logLine = JSON.stringify({ timestamp: new Date().toISOString(), ...event }) + '\n';
      eventBuffer.push(logLine);
      if (eventBuffer.length >= FLUSH_THRESHOLD) {
        // Trigger async flush without awaiting
        const dir = getEpisodicDir();
        flushBuffer(eventBuffer, path.join(dir, 'events.jsonl')).catch(console.error);
      }
    } catch (err) {
      console.error('[MemoryObservability] Failed to buffer episodic event:', err);
    }
  }

  /**
   * Async version of logEvent for compatibility. Still non-blocking in practice.
   */
  public static async logEventAsync(event: Record<string, any>): Promise<void> {
    this.logEvent(event);
  }

  /**
   * Fire-and-forget audit log — never awaited, does not block the caller.
   */
  public static logAuditAsync(
    actor: string,
    action: 'read' | 'write' | 'delete' | 'refine' | 'snapshot' | 'restore',
    targetType: string,
    targetId: string,
    details?: Record<string, any>
  ): void {
    try {
      ensureEpisodicDir();
      startFlushTimer();
      const entry: AuditLogEntry = {
        timestamp: new Date().toISOString(),
        actor,
        action,
        targetType,
        targetId,
        details
      };
      const logLine = JSON.stringify(entry) + '\n';
      auditBuffer.push(logLine);
      if (auditBuffer.length >= FLUSH_THRESHOLD) {
        const dir = getEpisodicDir();
        flushBuffer(auditBuffer, path.join(dir, 'audit.jsonl')).catch(console.error);
      }
    } catch (err) {
      console.error('[MemoryObservability] Failed to buffer audit log:', err);
    }
  }

  /**
   * Awaitable audit log for compatibility — delegates to logAuditAsync.
   */
  public static async logAudit(
    actor: string,
    action: 'read' | 'write' | 'delete' | 'refine' | 'snapshot' | 'restore',
    targetType: string,
    targetId: string,
    details?: Record<string, any>
  ): Promise<void> {
    this.logAuditAsync(actor, action, targetType, targetId, details);
  }

  /**
   * Forces an immediate flush of all buffered log entries.
   * Called on shutdown or checkpoint.
   */
  public static async flush(): Promise<void> {
    if (!episodicDirEnsured) return;
    const dir = getEpisodicDir();
    await Promise.allSettled([
      flushBuffer(auditBuffer, path.join(dir, 'audit.jsonl')),
      flushBuffer(eventBuffer, path.join(dir, 'events.jsonl'))
    ]);
  }

  /**
   * Stops the auto-flush timer and flushes remaining entries.
   */
  public static async shutdown(): Promise<void> {
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    await this.flush();
  }
}
