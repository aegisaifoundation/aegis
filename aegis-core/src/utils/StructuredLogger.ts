import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { workspaceManager } from '../runtime/WorkspaceManager.js';

export class StructuredLogger {
  private static instance = new StructuredLogger();

  public static getInstance(): StructuredLogger {
    return this.instance;
  }

  private getLogFilePath(): string {
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    return path.resolve(wsRoot, 'logs/runtime.log');
  }

  /**
   * Logs a structured event to workspace/logs/runtime.log.
   */
  public async log(level: 'info' | 'warn' | 'error', event: string, sessionId?: string, details?: Record<string, any>): Promise<void> {
    const logPath = this.getLogFilePath();
    const logDir = path.dirname(logPath);

    try {
      if (!existsSync(logDir)) {
        await fs.mkdir(logDir, { recursive: true });
      }

      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        event,
        sessionId: sessionId || 'system',
        details: details || {}
      };

      const line = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(logPath, line, 'utf8');
    } catch (err) {
      // In case logging itself fails, print to console so we don't swallow it completely
      console.error(`[StructuredLogger] Logging failed for event "${event}":`, err);
    }
  }

  public async info(event: string, sessionId?: string, details?: Record<string, any>): Promise<void> {
    await this.log('info', event, sessionId, details);
  }

  public async warn(event: string, sessionId?: string, details?: Record<string, any>): Promise<void> {
    await this.log('warn', event, sessionId, details);
  }

  public async error(event: string, sessionId?: string, details?: Record<string, any>): Promise<void> {
    await this.log('error', event, sessionId, details);
  }
}

export const logger = StructuredLogger.getInstance();
