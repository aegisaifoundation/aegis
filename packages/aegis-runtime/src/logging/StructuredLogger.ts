import path from 'path';
import fs from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { workspaceManager } from '../workspace/WorkspaceManager.js';

type LogLevel = 'info' | 'warn' | 'error' | 'none';
const LOG_LEVEL_ORDER: Record<LogLevel, number> = { info: 0, warn: 1, error: 2, none: 99 };
const configuredLevel: LogLevel = (process.env.AEGIS_LOG_LEVEL as LogLevel) || 'info';
const configuredLevelOrder = LOG_LEVEL_ORDER[configuredLevel] ?? 0;

let cachedLogPath: string | null = null;
let logDirEnsured = false;
const FLUSH_THRESHOLD = 100;
const FLUSH_INTERVAL_MS = 3000;

const lineBuffer: string[] = [];
let flushTimer: NodeJS.Timeout | null = null;

function getLogFilePath(): string {
  if (!cachedLogPath) {
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    cachedLogPath = path.resolve(wsRoot, 'logs/runtime.log');
  }
  return cachedLogPath;
}

function ensureLogDir(): void {
  if (logDirEnsured) return;
  const logPath = getLogFilePath();
  const logDir = path.dirname(logPath);
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
  logDirEnsured = true;
}

async function flushBuffer(): Promise<void> {
  if (lineBuffer.length === 0) return;
  try {
    ensureLogDir();
    const content = lineBuffer.splice(0, lineBuffer.length).join('');
    await fs.appendFile(getLogFilePath(), content, 'utf8');
  } catch (err) {
    console.error('[StructuredLogger] Failed to flush log buffer:', err);
  }
}

function startFlushTimer(): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    if (lineBuffer.length > 0) {
      flushBuffer().catch(console.error);
    }
  }, FLUSH_INTERVAL_MS);
}

export class StructuredLogger {
  private static instance = new StructuredLogger();

  public static getInstance(): StructuredLogger {
    return this.instance;
  }

  public log(level: 'info' | 'warn' | 'error', event: string, sessionId?: string, details?: Record<string, any>): void {
    if (LOG_LEVEL_ORDER[level] < configuredLevelOrder) return;

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
    } catch (err) {
      console.error(`[StructuredLogger] Logging failed for event "${event}":`, err);
    }
  }

  public async info(event: string, sessionId?: string, details?: Record<string, any>): Promise<void> {
    this.log('info', event, sessionId, details);
  }

  public async warn(event: string, sessionId?: string, details?: Record<string, any>): Promise<void> {
    this.log('warn', event, sessionId, details);
  }

  public async error(event: string, sessionId?: string, details?: Record<string, any>): Promise<void> {
    this.log('error', event, sessionId, details);
  }

  public async flush(): Promise<void> {
    await flushBuffer();
  }

  public async shutdown(): Promise<void> {
    if (flushTimer) {
      clearInterval(flushTimer);
      flushTimer = null;
    }
    await flushBuffer();
  }
}

export const logger = StructuredLogger.getInstance();
