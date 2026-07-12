import { eventBus } from '../eventbus/EventBus.js';
import { EventTypes } from '../eventbus/EventTypes.js';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { workspaceManager } from '../workspace/WorkspaceManager.js';

export class RuntimeSupervisorHooks {
  private static getTraceFilePath(): string {
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    return path.resolve(wsRoot, 'runtime/boot-trace.jsonl');
  }

  /**
   * Appends execution trace info to boot-trace.jsonl.
   */
  public static async writeTrace(stage: string, details?: Record<string, any>): Promise<void> {
    try {
      const traceFile = this.getTraceFilePath();
      const traceDir = path.dirname(traceFile);
      if (!existsSync(traceDir)) {
        await fs.mkdir(traceDir, { recursive: true });
      }
      const entry = {
        timestamp: new Date().toISOString(),
        stage,
        ...details
      };
      await fs.appendFile(traceFile, JSON.stringify(entry) + '\n', 'utf8');
      eventBus.emit(EventTypes.RUNTIME_BOOT_TRACE_RECORDED, entry, 'runtime-supervisor');
    } catch (err) {
      console.error('[RuntimeSupervisorHooks] Failed to write boot trace:', err);
    }
  }

  public static async onRuntimeDegraded(reason: string): Promise<void> {
    console.warn(`[Supervisor] Runtime health DEGRADED. Reason: ${reason}`);
    eventBus.emit(EventTypes.RUNTIME_HEALTH_CHANGED, { status: 'DEGRADED', reason }, 'runtime-supervisor');
    await this.writeTrace('HEALTH_DEGRADED', { reason });
  }

  public static async onRuntimeRecovered(sessionId: string): Promise<void> {
    console.log(`[Supervisor] Runtime health RECOVERED. Session: ${sessionId}`);
    eventBus.emit(EventTypes.RUNTIME_HEALTH_CHANGED, { status: 'HEALTHY', sessionId }, 'runtime-supervisor');
    await this.writeTrace('HEALTH_RECOVERED', { sessionId });
  }

  public static async onRuntimeQuarantined(sessionId: string, reason: string): Promise<void> {
    console.error(`[Supervisor] Session ${sessionId} QUARANTINED. Reason: ${reason}`);
    eventBus.emit(EventTypes.SESSION_QUARANTINED, { sessionId, reason }, 'runtime-supervisor');
    await this.writeTrace('SESSION_QUARANTINED', { sessionId, reason });
  }

  public static async onRuntimeCorrupted(reason: string): Promise<void> {
    console.error(`[Supervisor] Runtime state CORRUPTED. Reason: ${reason}`);
    eventBus.emit(EventTypes.RUNTIME_HEALTH_CHANGED, { status: 'CORRUPTED', reason }, 'runtime-supervisor');
    await this.writeTrace('RUNTIME_CORRUPTED', { reason });
  }

  public static async onRuntimeSafeModeEntered(reason: string): Promise<void> {
    console.warn(`[Supervisor] Runtime ENTERED SAFE_MODE. Reason: ${reason}`);
    eventBus.emit(EventTypes.RUNTIME_SAFE_MODE_ENTERED, { reason }, 'runtime-supervisor');
    await this.writeTrace('SAFE_MODE_ENTERED', { reason });
  }

  public static async onMountLeaseExpired(sessionId: string, leaseOwner: string): Promise<void> {
    console.warn(`[Supervisor] Mount lease expired for session ${sessionId}. Owner was: ${leaseOwner}`);
    eventBus.emit(EventTypes.RUNTIME_MOUNT_LEASE_EXPIRED, { sessionId, leaseOwner }, 'runtime-supervisor');
    await this.writeTrace('MOUNT_LEASE_EXPIRED', { sessionId, leaseOwner });
  }
}
