import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { workspaceManager } from '../runtime/WorkspaceManager.js';
const LOG_LEVEL_ORDER = { info: 0, warn: 1, error: 2, none: 99 };
const configuredLevel = process.env.AEGIS_LOG_LEVEL || 'info';
const configuredLevelOrder = LOG_LEVEL_ORDER[configuredLevel] ?? 0;
// ── Module-level path + directory cache ──────────────────────────
let cachedLogPath = null;
let logDirEnsured = false;
const FLUSH_THRESHOLD = 100;
const FLUSH_INTERVAL_MS = 3000;
const lineBuffer = [];
let flushTimer = null;
function getLogFilePath() {
    if (!cachedLogPath) {
        const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
        cachedLogPath = path.resolve(wsRoot, 'logs/runtime.log');
    }
    return cachedLogPath;
}
function ensureLogDir() {
    if (logDirEnsured)
        return;
    const logPath = getLogFilePath();
    const logDir = path.dirname(logPath);
    if (!existsSync(logDir)) {
        mkdirSync(logDir, { recursive: true });
    }
    logDirEnsured = true;
}
async function flushBuffer() {
    if (lineBuffer.length === 0)
        return;
    try {
        ensureLogDir();
        const content = lineBuffer.splice(0, lineBuffer.length).join('');
        await fs.appendFile(getLogFilePath(), content, 'utf8');
    }
    catch (err) {
        console.error('[StructuredLogger] Failed to flush log buffer:', err);
    }
}
function startFlushTimer() {
    if (flushTimer)
        return;
    flushTimer = setInterval(() => {
        if (lineBuffer.length > 0) {
            flushBuffer().catch(console.error);
        }
    }, FLUSH_INTERVAL_MS);
}
export class StructuredLogger {
    static instance = new StructuredLogger();
    static getInstance() {
        return this.instance;
    }
    /**
     * Logs a structured event — buffered, non-blocking.
     * Respects AEGIS_LOG_LEVEL environment variable.
     */
    log(level, event, sessionId, details) {
        // Skip if below configured log level
        if (LOG_LEVEL_ORDER[level] < configuredLevelOrder)
            return;
        try {
            startFlushTimer();
            const logEntry = {
                timestamp: new Date().toISOString(),
                level,
                event,
                sessionId: sessionId || 'system',
                details: details || {}
            };
            lineBuffer.push(JSON.stringify(logEntry) + '\n');
            if (lineBuffer.length >= FLUSH_THRESHOLD) {
                flushBuffer().catch(console.error);
            }
        }
        catch (err) {
            console.error(`[StructuredLogger] Logging failed for event "${event}":`, err);
        }
    }
    /** Async variant kept for backward compatibility — delegates to sync log(). */
    async info(event, sessionId, details) {
        this.log('info', event, sessionId, details);
    }
    async warn(event, sessionId, details) {
        this.log('warn', event, sessionId, details);
    }
    async error(event, sessionId, details) {
        this.log('error', event, sessionId, details);
    }
    /**
     * Forces an immediate flush of buffered log lines.
     * Call on shutdown or checkpoint.
     */
    async flush() {
        await flushBuffer();
    }
    /**
     * Stops the auto-flush timer and flushes remaining entries.
     */
    async shutdown() {
        if (flushTimer) {
            clearInterval(flushTimer);
            flushTimer = null;
        }
        await flushBuffer();
    }
}
export const logger = StructuredLogger.getInstance();
