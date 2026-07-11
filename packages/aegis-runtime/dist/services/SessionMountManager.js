import { serviceRegistry } from '../registry/ServiceRegistry.js';
const getMemoryManager = () => serviceRegistry.get('memoryManager');
import { SessionLifecycleState } from '@aegis/sdk';
import { runtimeStateManager } from './RuntimeStateManager.js';
import { SessionCompatibilityValidator } from './SessionCompatibilityValidator.js';
import { SessionStateTransitionValidator } from './SessionStateTransitionValidator.js';
import { eventBus } from '../eventbus/EventBus.js';
import { EventTypes } from '../eventbus/EventTypes.js';
import crypto from 'crypto';
export class SessionMountManager {
    static instance = new SessionMountManager();
    static getInstance() {
        return this.instance;
    }
    /**
     * Mounts a session as the single active cognitive context.
     * Runs transition, compatibility, and invariant validations before committing.
     */
    async mount(sessionId) {
        // 1. Load metadata to validate
        const metadata = await getMemoryManager().getMetadata(sessionId, 'system');
        // 2. Validate state transition rules
        const currentLifecycle = metadata.lifecycleState;
        const validTransition = SessionStateTransitionValidator.validate(currentLifecycle, SessionLifecycleState.ACTIVE);
        if (!validTransition) {
            eventBus.emit(EventTypes.SESSION_MOUNT_FAILED, { sessionId, reason: `Invalid transition from ${currentLifecycle} to ACTIVE` }, 'mount-manager');
            throw new Error(`Mount failed: Invalid transition from ${currentLifecycle} to ACTIVE.`);
        }
        // 3. Check schema and version compatibility
        const compatibility = SessionCompatibilityValidator.validate(metadata);
        if (!compatibility.compatible) {
            eventBus.emit(EventTypes.SESSION_MOUNT_FAILED, { sessionId, reason: compatibility.reason }, 'mount-manager');
            throw new Error(`Mount failed: Compatibility validation failed: ${compatibility.reason}`);
        }
        // 4. Update single source of truth runtime state
        const state = await runtimeStateManager.loadState();
        // Unmount any currently mounted session first to maintain the single mount invariant
        if (state.mountedSessionId && state.mountedSessionId !== sessionId) {
            await this.unmount(state.mountedSessionId);
        }
        state.mountedSessionId = sessionId;
        state.activeSessionId = sessionId;
        state.mountGeneration += 1;
        state.mountToken = crypto.randomUUID();
        state.lastSessionSwitchAt = new Date().toISOString();
        state.mountLease = {
            ownerRuntimeId: state.runtimeId,
            acquiredAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 600000).toISOString() // 10 minutes lease refresh
        };
        await runtimeStateManager.saveState(state);
        // Synchronize current memories cache in MemoryManager
        await getMemoryManager().switchActiveSession(sessionId);
        // 5. Update session metadata and last validated cache properties
        metadata.lifecycleState = SessionLifecycleState.ACTIVE;
        metadata.lastMountedAt = new Date().toISOString();
        metadata.lastAccessedAt = new Date().toISOString();
        metadata.validationChecksum = metadata.checksums.sessionMemory;
        metadata.lastValidatedAt = new Date().toISOString();
        await getMemoryManager().updateMetadata(sessionId, metadata, 'system');
        eventBus.emit(EventTypes.SESSION_MOUNTED, { sessionId, mountToken: state.mountToken }, 'mount-manager');
        eventBus.emit(EventTypes.RUNTIME_MOUNT_GENERATION_CHANGED, { mountGeneration: state.mountGeneration }, 'mount-manager');
        eventBus.emit(EventTypes.RUNTIME_MOUNT_LEASE_ACQUIRED, { sessionId }, 'mount-manager');
    }
    /**
     * Unmounts the session, transitioning it back to INACTIVE state.
     */
    async unmount(sessionId) {
        try {
            const metadata = await getMemoryManager().getMetadata(sessionId, 'system');
            if (metadata.lifecycleState === SessionLifecycleState.ACTIVE) {
                metadata.lifecycleState = SessionLifecycleState.INACTIVE;
                await getMemoryManager().updateMetadata(sessionId, metadata, 'system');
            }
        }
        catch (err) {
            // In case session dir has been deleted/moved
        }
        const state = await runtimeStateManager.loadState();
        if (state.mountedSessionId === sessionId) {
            state.mountedSessionId = '';
            state.mountLease = undefined;
            await runtimeStateManager.saveState(state);
        }
        eventBus.emit(EventTypes.SESSION_UNMOUNTED, { sessionId }, 'mount-manager');
        eventBus.emit(EventTypes.RUNTIME_MOUNT_LEASE_EXPIRED, { sessionId }, 'mount-manager');
    }
    async getMountedSession() {
        const state = await runtimeStateManager.loadState();
        return state.mountedSessionId || null;
    }
    async validateMount(sessionId) {
        const mounted = await this.getMountedSession();
        if (mounted !== sessionId)
            return false;
        try {
            const metadata = await getMemoryManager().getMetadata(sessionId, 'system');
            return metadata.lifecycleState === SessionLifecycleState.ACTIVE;
        }
        catch {
            return false;
        }
    }
}
export const sessionMountManager = SessionMountManager.getInstance();
