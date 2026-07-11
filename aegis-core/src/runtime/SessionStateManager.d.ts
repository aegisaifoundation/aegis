import { SessionState } from '../memory/interfaces/MemoryTypes.js';
export declare class SessionStateManager {
    private static instance;
    static getInstance(): SessionStateManager;
    /**
     * Initializes authoritative session-state.json inside a session.
     */
    initializeSessionState(sessionId: string, actor?: string): Promise<SessionState>;
    /**
     * Loads the authoritative session state.
     */
    loadSessionState(sessionId: string, actor?: string): Promise<SessionState>;
    /**
     * Directly saves session state (outside of the mutation pipeline).
     */
    saveSessionState(state: SessionState, txId?: string, actor?: string): Promise<void>;
    /**
     * Validates structural integrity of the SessionState object.
     */
    validateSessionState(state: SessionState): void;
    /**
     * Performs an atomic state update using the full transaction pipeline:
     * Validation → Transaction Begin → Mutation → Projection → Consistency Check → Commit → Dispatch.
     *
     * OPTIMIZATION: Checkpoint is NOT created here on every mutation. It is the caller's
     * responsibility to create a turn-level checkpoint via checkpointSessionState() once
     * per user turn (in RuntimeExecutor.execute()) before any mutations begin.
     */
    updateSessionState(sessionId: string, updates: Partial<SessionState>, actor?: string): Promise<void>;
    /**
     * Checkpoints both runtime and session states.
     * Should be called ONCE per user turn (at the start of RuntimeExecutor.execute()),
     * not inside updateSessionState.
     */
    checkpointSessionState(sessionId: string, name: string): Promise<void>;
    /**
     * Restores both runtime and session states from checkpoint, then projects markdown files.
     */
    recoverSessionState(sessionId: string, name: string): Promise<void>;
    /**
     * Refines the list of stable facts using the LLM.
     */
    private refineStableFacts;
}
export declare const sessionStateManager: SessionStateManager;
