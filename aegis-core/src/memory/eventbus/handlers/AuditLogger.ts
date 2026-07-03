import fs from 'fs';
import path from 'path';
import { MemoryEvent } from '../MemoryEvent.js';
import { workspaceManager } from '../../../runtime/WorkspaceManager.js';

export class AuditLogger {
  private static getLogPath(): string {
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    return path.resolve(wsRoot, 'memory/analytics/audit.jsonl');
  }

  public static async handleEvent(event: MemoryEvent): Promise<void> {
    try {
      const logPath = this.getLogPath();
      const logDir = path.dirname(logPath);
      
      if (!fs.existsSync(logDir)) {
        await fs.promises.mkdir(logDir, { recursive: true });
      }

      const logEntry = JSON.stringify({
        timestamp: event.timestamp,
        eventId: event.eventId,
        topic: event.topic,
        sessionId: event.sessionId,
        actor: event.actor,
        payload: event.payload
      });

      await fs.promises.appendFile(logPath, logEntry + '\n', 'utf8');
    } catch (err) {
      console.error('[AuditLogger] Failed to write event to audit log:', err);
    }
  }
}
