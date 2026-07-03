import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { workspaceManager } from './WorkspaceManager.js';
import { runtimeStateManager } from './RuntimeStateManager.js';
import { memoryGateway } from '../memory/MemoryGateway.js';
import { projectionConsistencyValidator } from '../memory/ProjectionConsistencyValidator.js';
import { RuntimeHealthStatus } from '../memory/interfaces/MemoryTypes.js';
export class RuntimeHealthValidator {
    static instance = new RuntimeHealthValidator();
    static getInstance() {
        return this.instance;
    }
    /**
     * Performs a full suite of health checks on the runtime system.
     */
    async validateHealth() {
        const errors = [];
        // 1. Validate runtime-state.json integrity
        let runtimeState = null;
        try {
            runtimeState = await runtimeStateManager.loadState();
            if (!runtimeState || !runtimeState.runtimeId || typeof runtimeState.runtimeEpoch !== 'number') {
                errors.push('runtime-state.json has corrupted or missing fields');
            }
        }
        catch (err) {
            errors.push(`runtime-state.json read error: ${err.message}`);
        }
        // 2. Validate current session state and projections
        const activeSessionId = runtimeState?.activeSessionId;
        if (activeSessionId) {
            const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
            const sessionDir = path.resolve(wsRoot, `memory/sessions/${activeSessionId}`);
            if (!existsSync(sessionDir)) {
                errors.push(`Active session directory does not exist: ${sessionDir}`);
            }
            else {
                // A. Validate session-state.json
                let sessionState = null;
                try {
                    sessionState = await memoryGateway.getSessionState(activeSessionId);
                    if (!sessionState || !sessionState.sessionId || sessionState.sessionId !== activeSessionId) {
                        errors.push('session-state.json has corrupted or mismatching sessionId');
                    }
                }
                catch (err) {
                    errors.push(`session-state.json read error: ${err.message}`);
                }
                // B. Validate projections existence and consistency
                if (sessionState) {
                    try {
                        const workingMemory = await memoryGateway.getWorkingMemory(activeSessionId);
                        const sessionMemory = await memoryGateway.getSessionMemory(activeSessionId);
                        const taskMemory = await memoryGateway.getTask(activeSessionId);
                        const workingVal = projectionConsistencyValidator.validateWorkingProjection(workingMemory, sessionState);
                        if (!workingVal.valid) {
                            errors.push(`working-memory.md projection inconsistency: ${workingVal.reason}`);
                        }
                        const sessionVal = projectionConsistencyValidator.validateSessionProjection(sessionMemory, sessionState);
                        if (!sessionVal.valid) {
                            errors.push(`session-memory.md projection inconsistency: ${sessionVal.reason}`);
                        }
                        const taskVal = projectionConsistencyValidator.validateTaskProjection(taskMemory, sessionState);
                        if (!taskVal.valid) {
                            errors.push(`task.md projection inconsistency: ${taskVal.reason}`);
                        }
                    }
                    catch (err) {
                        errors.push(`Markdown projection read error: ${err.message}`);
                    }
                }
                // C. Interrupted transaction detection (.tmp files in session folder)
                try {
                    const files = await fs.readdir(sessionDir);
                    const tmpFiles = files.filter(f => f.endsWith('.tmp'));
                    if (tmpFiles.length > 0) {
                        errors.push(`Interrupted write transaction detected. Leftover temporary files: ${tmpFiles.join(', ')}`);
                    }
                }
                catch (err) {
                    errors.push(`Failed to scan session directory for leftover transactions: ${err.message}`);
                }
            }
        }
        // 3. Validate checkpoints directory
        const checkpointsDir = path.resolve(path.dirname(workspaceManager.getWorkspacePath()), 'runtime/checkpoints');
        if (existsSync(checkpointsDir)) {
            try {
                const files = await fs.readdir(checkpointsDir);
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        const filePath = path.join(checkpointsDir, file);
                        const content = await fs.readFile(filePath, 'utf8');
                        try {
                            JSON.parse(content);
                        }
                        catch {
                            errors.push(`Corrupted checkpoint file detected: ${file}`);
                        }
                    }
                }
            }
            catch (err) {
                errors.push(`Failed to check checkpoint files: ${err.message}`);
            }
        }
        // 4. Validate Lock state / lease validity
        if (runtimeState && runtimeState.mountLease) {
            const expiresAt = new Date(runtimeState.mountLease.expiresAt).getTime();
            if (Date.now() > expiresAt) {
                errors.push('Active session mount lease has expired / is stale');
            }
        }
        const healthy = errors.length === 0;
        const status = healthy ? RuntimeHealthStatus.HEALTHY : RuntimeHealthStatus.DEGRADED;
        return {
            healthy,
            status,
            errors
        };
    }
}
export const runtimeHealthValidator = RuntimeHealthValidator.getInstance();
