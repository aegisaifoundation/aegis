export interface CheckpointMetadata {
    jobId: string;
    name: string;
    step: number;
    epoch: number;
    loss: number;
    accuracy?: number;
    timestamp: string;
}
export declare class CheckpointManager {
    private workspaceRoot;
    constructor(workspaceRoot?: string);
    private getCheckpointDir;
    saveCheckpoint(jobId: string, name: string, data: Omit<CheckpointMetadata, 'timestamp' | 'jobId'>): Promise<string>;
    listCheckpoints(jobId: string): Promise<CheckpointMetadata[]>;
    cleanupOldCheckpoints(jobId: string, maxToKeep?: number): Promise<void>;
    clearAll(jobId: string): Promise<void>;
}
export declare const checkpointManager: CheckpointManager;
export default checkpointManager;
