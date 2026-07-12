import { SessionMetadata } from '@aegis/sdk';
export declare class RuntimeContinuityValidator {
    /**
     * Enforces that only one session has ACTIVE lifecycle state.
     */
    static validateMountInvariant(sessions: SessionMetadata[], activeSessionId: string | null): boolean;
    /**
     * Evaluates mountToken, mountGeneration, and runtimeEpoch to check if a context reference is stale.
     */
    static validateStaleContext(consumerToken: string, consumerGen: number, consumerEpoch: number, expectedToken: string, expectedGen: number, expectedEpoch: number): boolean;
}
