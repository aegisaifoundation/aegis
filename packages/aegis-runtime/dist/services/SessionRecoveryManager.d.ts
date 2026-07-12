export declare class SessionRecoveryManager {
    /**
     * Quarantines a repeatedly failing or corrupted session to workspace/memory/quarantine/<session-id>/
     * and sets its lifecycle status to CORRUPTED.
     */
    static quarantineSession(sessionId: string, reason: string): Promise<void>;
    /**
     * Recovers a session from snapshots. If it fails, quarantine the session.
     */
    static recoverFailedMount(sessionId: string): Promise<void>;
    static recoverInterruptedCheckout(sessionId: string): Promise<void>;
    static recoverCorruptedRuntimeState(): Promise<void>;
}
