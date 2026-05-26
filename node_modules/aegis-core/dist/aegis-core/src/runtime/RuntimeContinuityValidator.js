import { SessionLifecycleState } from '../memory/interfaces/MemoryTypes.js';
import { eventBus } from '../events/EventBus.js';
import { EventTypes } from '../events/EventTypes.js';
export class RuntimeContinuityValidator {
    /**
     * Enforces that only one session has ACTIVE lifecycle state.
     */
    static validateMountInvariant(sessions, activeSessionId) {
        const activeSessions = sessions.filter(s => s.lifecycleState === SessionLifecycleState.ACTIVE);
        if (activeSessions.length > 1) {
            eventBus.emit(EventTypes.RUNTIME_MOUNT_INVARIANT_VIOLATED, {
                activeCount: activeSessions.length,
                activeSessionIds: activeSessions.map(s => s.sessionId)
            }, 'continuity-validator');
            return false;
        }
        if (activeSessionId) {
            const active = sessions.find(s => s.sessionId === activeSessionId);
            if (active && active.lifecycleState !== SessionLifecycleState.ACTIVE) {
                eventBus.emit(EventTypes.RUNTIME_MOUNT_INVARIANT_VIOLATED, {
                    activeSessionId,
                    actualLifecycle: active.lifecycleState
                }, 'continuity-validator');
                return false;
            }
        }
        return true;
    }
    /**
     * Evaluates mountToken, mountGeneration, and runtimeEpoch to check if a context reference is stale.
     */
    static validateStaleContext(consumerToken, consumerGen, consumerEpoch, expectedToken, expectedGen, expectedEpoch) {
        if (consumerToken !== expectedToken || consumerGen !== expectedGen || consumerEpoch !== expectedEpoch) {
            eventBus.emit(EventTypes.RUNTIME_STALE_CONTEXT_INVALIDATED, {
                consumerToken,
                consumerGen,
                consumerEpoch,
                expectedToken,
                expectedGen,
                expectedEpoch
            }, 'continuity-validator');
            return false;
        }
        return true;
    }
}
