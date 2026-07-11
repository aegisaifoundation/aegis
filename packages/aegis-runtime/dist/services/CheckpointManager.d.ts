export interface ICheckpointable {
    createCheckpoint(name: string, sessionId?: string): Promise<void>;
    rollbackToCheckpoint(name: string, sessionId?: string): Promise<void>;
}
export declare class CheckpointManager {
    private registries;
    register(target: ICheckpointable): void;
    unregister(target: ICheckpointable): void;
    private getCheckpointsDir;
    createCheckpoint(name: string, sessionId?: string): Promise<void>;
    rollbackToCheckpoint(name: string, sessionId?: string): Promise<void>;
}
export declare const checkpointManager: CheckpointManager;
