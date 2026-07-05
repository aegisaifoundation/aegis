import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { workspaceManager } from '@aegis/runtime';
// ── Module-level dir existence cache ──────────────────────────────
let episodicDirPath = null;
let episodicDirEnsured = false;
// ── In-memory write buffers ────────────────────────────────────────
const auditBuffer = [];
const eventBuffer = [];
const FLUSH_THRESHOLD = 50;
function getEpisodicDir() {
    if (!episodicDirPath) {
        const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
        episodicDirPath = path.resolve(wsRoot, 'memory/episodic');
    }
    return episodicDirPath;
}
function ensureEpisodicDir() {
    if (episodicDirEnsured)
        return;
    const dir = getEpisodicDir();
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
    episodicDirEnsured = true;
}
async function flushBuffer(buffer, filePath) {
    if (buffer.length === 0)
        return;
    const content = buffer.splice(0, buffer.length).join('');
    try {
        await fs.appendFile(filePath, content, 'utf8');
    }
    catch (err) {
        console.error('[MemoryObservability] Failed to flush log buffer:', err);
    }
}
// Auto-flush every 5 seconds
let flushTimer = null;
function startFlushTimer() {
    if (flushTimer)
        return;
    flushTimer = setInterval(async () => {
        if (!episodicDirEnsured)
            return;
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
    static logEvent(event) {
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
        }
        catch (err) {
            console.error('[MemoryObservability] Failed to buffer episodic event:', err);
        }
    }
    /**
     * Async version of logEvent for compatibility. Still non-blocking in practice.
     */
    static async logEventAsync(event) {
        this.logEvent(event);
    }
    /**
     * Fire-and-forget audit log — never awaited, does not block the caller.
     */
    static logAuditAsync(actor, action, targetType, targetId, details) {
        try {
            ensureEpisodicDir();
            startFlushTimer();
            const entry = {
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
        }
        catch (err) {
            console.error('[MemoryObservability] Failed to buffer audit log:', err);
        }
    }
    /**
     * Awaitable audit log for compatibility — delegates to logAuditAsync.
     */
    static async logAudit(actor, action, targetType, targetId, details) {
        this.logAuditAsync(actor, action, targetType, targetId, details);
    }
    /**
     * Forces an immediate flush of all buffered log entries.
     * Called on shutdown or checkpoint.
     */
    static async flush() {
        if (!episodicDirEnsured)
            return;
        const dir = getEpisodicDir();
        await Promise.allSettled([
            flushBuffer(auditBuffer, path.join(dir, 'audit.jsonl')),
            flushBuffer(eventBuffer, path.join(dir, 'events.jsonl'))
        ]);
    }
    /**
     * Stops the auto-flush timer and flushes remaining entries.
     */
    static async shutdown() {
        if (flushTimer) {
            clearInterval(flushTimer);
            flushTimer = null;
        }
        await this.flush();
    }
}
