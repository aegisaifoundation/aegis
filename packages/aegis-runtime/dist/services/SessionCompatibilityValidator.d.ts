import { SessionMetadata } from '@aegis/sdk';
export declare class SessionCompatibilityValidator {
    private static targetContextVersion;
    /**
     * Validates session metadata for compatibility before mounting.
     * Emits session.compatibility.failed on validation failure.
     */
    static validate(metadata: SessionMetadata): {
        compatible: boolean;
        reason?: string;
    };
}
