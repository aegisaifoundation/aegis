import { eventBus } from '../events/EventBus.js';
import { EventTypes } from '../events/EventTypes.js';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { workspaceManager } from './WorkspaceManager.js';
export class RuntimeSupervisorHooks {
    static getTraceFilePath() {
        const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
        return path.resolve(wsRoot, 'runtime/boot-trace.jsonl');
    }
    /**
     * Appends execution trace info to boot-trace.jsonl.
     */
    static async writeTrace(stage, details) {
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
        }
        catch (err) {
            console.error('[RuntimeSupervisorHooks] Failed to write boot trace:', err);
        }
    }
    static async onRuntimeDegraded(reason) {
        console.warn(`[Supervisor] Runtime health DEGRADED. Reason: ${reason}`);
        eventBus.emit(EventTypes.RUNTIME_HEALTH_CHANGED, { status: 'DEGRADED', reason }, 'runtime-supervisor');
        await this.writeTrace('HEALTH_DEGRADED', { reason });
    }
    static async onRuntimeRecovered(sessionId) {
        console.log(`[Supervisor] Runtime health RECOVERED. Session: ${sessionId}`);
        eventBus.emit(EventTypes.RUNTIME_HEALTH_CHANGED, { status: 'HEALTHY', sessionId }, 'runtime-supervisor');
        await this.writeTrace('HEALTH_RECOVERED', { sessionId });
    }
    static async onRuntimeQuarantined(sessionId, reason) {
        console.error(`[Supervisor] Session ${sessionId} QUARANTINED. Reason: ${reason}`);
        eventBus.emit(EventTypes.SESSION_QUARANTINED, { sessionId, reason }, 'runtime-supervisor');
        await this.writeTrace('SESSION_QUARANTINED', { sessionId, reason });
    }
    static async onRuntimeCorrupted(reason) {
        console.error(`[Supervisor] Runtime state CORRUPTED. Reason: ${reason}`);
        eventBus.emit(EventTypes.RUNTIME_HEALTH_CHANGED, { status: 'CORRUPTED', reason }, 'runtime-supervisor');
        await this.writeTrace('RUNTIME_CORRUPTED', { reason });
    }
    static async onRuntimeSafeModeEntered(reason) {
        console.warn(`[Supervisor] Runtime ENTERED SAFE_MODE. Reason: ${reason}`);
        eventBus.emit(EventTypes.RUNTIME_SAFE_MODE_ENTERED, { reason }, 'runtime-supervisor');
        await this.writeTrace('SAFE_MODE_ENTERED', { reason });
    }
    static async onMountLeaseExpired(sessionId, leaseOwner) {
        console.warn(`[Supervisor] Mount lease expired for session ${sessionId}. Owner was: ${leaseOwner}`);
        eventBus.emit(EventTypes.RUNTIME_MOUNT_LEASE_EXPIRED, { sessionId, leaseOwner }, 'runtime-supervisor');
        await this.writeTrace('MOUNT_LEASE_EXPIRED', { sessionId, leaseOwner });
    }
}
