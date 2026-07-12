import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import crypto from 'crypto';
import { workspaceManager } from '../workspace/WorkspaceManager.js';
import { safeJsonRead, safeJsonWrite } from '../utils/fileHelpers.js';
import { eventBus } from '../eventbus/EventBus.js';
import { EventTypes } from '../eventbus/EventTypes.js';
import { RuntimeLockState, BootMode, RuntimeHealthStatus, RuntimeMode } from '@aegis/sdk';
import { RuntimeSupervisorHooks } from './RuntimeSupervisorHooks.js';
import { checkpointManager } from './CheckpointManager.js';
export class RuntimeStateManager {
    static instance = new RuntimeStateManager();
    cache = null;
    constructor() {
        checkpointManager.register(this);
    }
    static getInstance() {
        return this.instance;
    }
    getStateFilePath() {
        const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
        return path.resolve(wsRoot, 'runtime/runtime-state.json');
    }
    /**
     * Loads state from runtime-state.json. Falls back to default state on failure or missing file.
     */
    async loadState() {
        if (this.cache)
            return this.cache;
        const filePath = this.getStateFilePath();
        const defaultState = this.generateDefaultState();
        try {
            const data = await safeJsonRead(filePath, null);
            if (data) {
                this.cache = data;
                eventBus.emit(EventTypes.RUNTIME_STATE_LOADED, { runtimeId: data.runtimeId }, 'runtime-state');
                return data;
            }
        }
        catch (err) {
            console.error('[RuntimeStateManager] Failed to read state, recovering...', err);
            await this.recoverRuntimeState();
        }
        this.cache = defaultState;
        await this.saveState(defaultState);
        return defaultState;
    }
    /**
     * Saves runtime state atomically.
     */
    async saveState(state) {
        this.cache = state;
        const filePath = this.getStateFilePath();
        await safeJsonWrite(filePath, state);
        eventBus.emit(EventTypes.RUNTIME_STATE_PERSISTED, { runtimeId: state.runtimeId }, 'runtime-state');
    }
    async updateActiveSession(sessionId) {
        const state = await this.loadState();
        state.activeSessionId = sessionId;
        state.lastSessionSwitchAt = new Date().toISOString();
        await this.saveState(state);
    }
    async updateMountedSession(sessionId) {
        const state = await this.loadState();
        state.mountedSessionId = sessionId;
        await this.saveState(state);
    }
    /**
     * Marks startup. Emits crash detection if the last run did not exit cleanly.
     */
    async markStartup() {
        const state = await this.loadState();
        if (state.lastShutdownClean === false) {
            state.bootMode = BootMode.RECOVERY_MODE;
            state.runtimeHealthStatus = RuntimeHealthStatus.RECOVERING;
            state.recoveryRequired = true;
            state.recoveryReason = 'UNCLEAN_SHUTDOWN';
            state.recoveryAttempts += 1;
            eventBus.emit(EventTypes.RUNTIME_CRASH_DETECTED, { runtimeId: state.runtimeId }, 'runtime-state');
            await RuntimeSupervisorHooks.onRuntimeDegraded('Unclean shutdown detected, entering RECOVERY_MODE.');
        }
        else {
            state.lastShutdownClean = false; // set to false; marked clean only on shutdown
        }
        state.lastBootAt = new Date().toISOString();
        state.lastHeartbeatAt = new Date().toISOString();
        await this.saveState(state);
    }
    /**
     * Marks clean exit on shutdown.
     */
    async markShutdown() {
        const state = await this.loadState();
        state.lastShutdownClean = true;
        state.lastShutdownAt = new Date().toISOString();
        await this.saveState(state);
    }
    async lockRuntime(lockState) {
        const state = await this.loadState();
        state.runtimeLockState = lockState;
        await this.saveState(state);
        eventBus.emit(EventTypes.RUNTIME_LOCK_ACQUIRED, { lockState }, 'runtime-state');
    }
    async unlockRuntime() {
        const state = await this.loadState();
        state.runtimeLockState = RuntimeLockState.IDLE;
        await this.saveState(state);
        eventBus.emit(EventTypes.RUNTIME_LOCK_RELEASED, {}, 'runtime-state');
    }
    async isRuntimeLocked() {
        const state = await this.loadState();
        return state.runtimeLockState !== RuntimeLockState.IDLE;
    }
    async validateRuntimeState() {
        const filePath = this.getStateFilePath();
        if (!existsSync(filePath))
            return false;
        try {
            const data = await safeJsonRead(filePath, null);
            return !!(data && typeof data.runtimeId === 'string' && typeof data.runtimeEpoch === 'number');
        }
        catch {
            return false;
        }
    }
    async recoverRuntimeState() {
        const defaultState = this.generateDefaultState();
        defaultState.bootMode = BootMode.RECOVERY_MODE;
        defaultState.recoveryRequired = true;
        defaultState.recoveryReason = 'CORRUPTED_STATE';
        await this.saveState(defaultState);
        await RuntimeSupervisorHooks.writeTrace('RUNTIME_STATE_RECOVERED', { runtimeId: defaultState.runtimeId });
    }
    /**
     * Saves a rollback point-in-time state checkpoint under workspace/runtime/checkpoints/.
     */
    async createCheckpoint(name, sessionId) {
        const state = await this.loadState();
        const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
        const cpDir = path.resolve(wsRoot, 'runtime/checkpoints');
        if (!existsSync(cpDir)) {
            await fs.mkdir(cpDir, { recursive: true });
        }
        const cpPath = path.join(cpDir, `${name}.json`);
        await safeJsonWrite(cpPath, state);
        state.lastRecoveryCheckpoint = cpPath;
        await this.saveState(state);
        eventBus.emit(EventTypes.RUNTIME_RECOVERY_CHECKPOINT_CREATED, { checkpoint: cpPath }, 'runtime-state');
        await RuntimeSupervisorHooks.writeTrace('CHECKPOINT_CREATED', { name });
    }
    /**
     * Restores runtime state parameters from a checkpoint file.
     */
    async rollbackToCheckpoint(name, sessionId) {
        const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
        const cpPath = path.resolve(wsRoot, `runtime/checkpoints/${name}.json`);
        if (!existsSync(cpPath)) {
            throw new Error(`Checkpoint ${name} not found.`);
        }
        const state = await safeJsonRead(cpPath, this.generateDefaultState());
        state.runtimeEpoch += 1; // Increment epoch on forced reset
        await this.saveState(state);
        eventBus.emit(EventTypes.RUNTIME_RECOVERY_CHECKPOINT_RESTORED, { checkpoint: cpPath }, 'runtime-state');
        await RuntimeSupervisorHooks.writeTrace('CHECKPOINT_RESTORED', { name });
    }
    generateDefaultState() {
        return {
            runtimeId: crypto.randomUUID(),
            runtimeClusterId: 'cluster-default',
            runtimeEpoch: 1,
            activeSessionId: '',
            mountedSessionId: '',
            runtimeState: 'ACTIVE',
            bootMode: BootMode.RESTORE_PREVIOUS,
            lastBootAt: new Date().toISOString(),
            lastShutdownAt: '',
            runtimeVersion: '1.0.0',
            lastSessionSwitchAt: '',
            recoveryRequired: false,
            recoveryReason: '',
            recoveryAttempts: 0,
            runtimeLockState: RuntimeLockState.IDLE,
            mountGeneration: 0,
            mountToken: crypto.randomUUID(),
            lastShutdownClean: true,
            lastHeartbeatAt: new Date().toISOString(),
            activeCapabilities: {
                tools: [],
                plugins: [],
                providers: [],
                workflows: []
            },
            runtimeHealthStatus: RuntimeHealthStatus.HEALTHY,
            runtimeContextVersion: '1.0.0',
            runtimeMode: RuntimeMode.NORMAL
        };
    }
}
import { serviceRegistry } from '../registry/ServiceRegistry.js';
export const runtimeStateManager = RuntimeStateManager.getInstance();
serviceRegistry.register('runtimeStateManager', runtimeStateManager);
