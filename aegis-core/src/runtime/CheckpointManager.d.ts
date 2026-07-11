export declare class CheckpointManager {
    private static instance;
    static getInstance(): CheckpointManager;
    private getCheckpointsDir;
    /**
     * Checkpoints only runtime-state.json and session-state.json.
     * Markdown files are NOT checkpointed.
     */
    createCheckpoint(name: string, sessionId: string): Promise<void>;
    /**
     * Restores runtime-state.json and session-state.json from checkpoint, then regenerates projections.
     */
    rollbackToCheckpoint(name: string, sessionId: string): Promise<void>;
}
export declare const checkpointManager: CheckpointManager;
