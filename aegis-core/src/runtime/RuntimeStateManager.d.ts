import { RuntimeLockState, BootMode, RuntimeHealthStatus, RuntimeMode } from '../memory/interfaces/MemoryTypes.js';
export interface RuntimeStateData {
    runtimeId: string;
    runtimeClusterId: string;
    runtimeEpoch: number;
    activeSessionId: string;
    mountedSessionId: string;
    runtimeState: 'ACTIVE' | 'INACTIVE';
    bootMode: BootMode;
    lastBootAt: string;
    lastShutdownAt: string;
    runtimeVersion: string;
    lastSessionSwitchAt: string;
    recoveryRequired: boolean;
    recoveryReason: string;
    recoveryAttempts: number;
    runtimeLockState: RuntimeLockState;
    mountGeneration: number;
    mountToken: string;
    lastShutdownClean: boolean;
    lastHeartbeatAt: string;
    checkoutStage?: string;
    activeCapabilities: {
        tools: string[];
        plugins: string[];
        providers: string[];
        workflows: string[];
    };
    runtimeHealthStatus: RuntimeHealthStatus;
    runtimeContextVersion: string;
    lastRecoveryCheckpoint?: string;
    runtimeMode: RuntimeMode;
    lastMountIntent?: string;
    mountLease?: {
        ownerRuntimeId: string;
        acquiredAt: string;
        expiresAt: string;
    };
}
export declare class RuntimeStateManager {
    private static instance;
    private cache;
    static getInstance(): RuntimeStateManager;
    private getStateFilePath;
    /**
     * Loads state from runtime-state.json. Falls back to default state on failure or missing file.
     */
    loadState(): Promise<RuntimeStateData>;
    /**
     * Saves runtime state atomically.
     */
    saveState(state: RuntimeStateData): Promise<void>;
    updateActiveSession(sessionId: string): Promise<void>;
    updateMountedSession(sessionId: string): Promise<void>;
    /**
     * Marks startup. Emits crash detection if the last run did not exit cleanly.
     */
    markStartup(): Promise<void>;
    /**
     * Marks clean exit on shutdown.
     */
    markShutdown(): Promise<void>;
    lockRuntime(lockState: RuntimeLockState): Promise<void>;
    unlockRuntime(): Promise<void>;
    isRuntimeLocked(): Promise<boolean>;
    validateRuntimeState(): Promise<boolean>;
    recoverRuntimeState(): Promise<void>;
    /**
     * Saves a rollback point-in-time state checkpoint under workspace/runtime/checkpoints/.
     */
    createCheckpoint(name: string): Promise<void>;
    /**
     * Restores runtime state parameters from a checkpoint file.
     */
    rollbackToCheckpoint(name: string): Promise<void>;
    private generateDefaultState;
}
export declare const runtimeStateManager: RuntimeStateManager;
