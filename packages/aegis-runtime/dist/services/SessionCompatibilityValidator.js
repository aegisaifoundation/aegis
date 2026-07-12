import { eventBus } from '../eventbus/EventBus.js';
import { EventTypes } from '../eventbus/EventTypes.js';
export class SessionCompatibilityValidator {
    static targetContextVersion = '1.0.0';
    /**
     * Validates session metadata for compatibility before mounting.
     * Emits session.compatibility.failed on validation failure.
     */
    static validate(metadata) {
        // 1. Check memory version compatibility
        if (metadata.memoryVersion && metadata.memoryVersion !== '1.0.0') {
            eventBus.emit(EventTypes.SESSION_COMPATIBILITY_FAILED, {
                sessionId: metadata.sessionId,
                reason: `Memory version mismatch: expected 1.0.0, got ${metadata.memoryVersion}`
            }, 'session-continuity');
            return {
                compatible: false,
                reason: `Memory version mismatch: expected 1.0.0, got ${metadata.memoryVersion}`
            };
        }
        // 2. Verify existence of basic structure properties
        if (!metadata.sessionId || !metadata.lifecycleState || !metadata.checksums) {
            eventBus.emit(EventTypes.SESSION_COMPATIBILITY_FAILED, {
                sessionId: metadata.sessionId,
                reason: 'Missing core session properties (sessionId, lifecycleState, or checksums)'
            }, 'session-continuity');
            return {
                compatible: false,
                reason: 'Missing core session properties'
            };
        }
        return { compatible: true };
    }
}
