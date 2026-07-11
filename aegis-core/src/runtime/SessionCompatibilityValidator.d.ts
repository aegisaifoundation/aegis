import { SessionMetadata } from '../memory/interfaces/MemoryTypes.js';
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
