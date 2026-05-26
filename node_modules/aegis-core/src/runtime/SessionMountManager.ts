import { SessionMetadata, SessionLifecycleState } from '../memory/interfaces/MemoryTypes.js';
import { runtimeStateManager } from './RuntimeStateManager.js';
import { SessionCompatibilityValidator } from './SessionCompatibilityValidator.js';
import { SessionStateTransitionValidator } from './SessionStateTransitionValidator.js';
import { eventBus } from '../events/EventBus.js';
import { EventTypes } from '../events/EventTypes.js';
import { memoryManager } from '../memory/MemoryManager.js';
import crypto from 'crypto';

export class SessionMountManager {
  private static instance = new SessionMountManager();

  public static getInstance(): SessionMountManager {
    return this.instance;
  }

  /**
   * Mounts a session as the single active cognitive context.
   * Runs transition, compatibility, and invariant validations before committing.
   */
  public async mount(sessionId: string): Promise<void> {
    // 1. Load metadata to validate
    const metadata = await memoryManager.getMetadata(sessionId, 'system');
    
    // 2. Validate state transition rules
    const currentLifecycle = metadata.lifecycleState as SessionLifecycleState;
    const validTransition = SessionStateTransitionValidator.validate(
      currentLifecycle,
      SessionLifecycleState.ACTIVE
    );
    
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
    await memoryManager.switchActiveSession(sessionId);

    // 5. Update session metadata and last validated cache properties
    metadata.lifecycleState = SessionLifecycleState.ACTIVE;
    metadata.lastMountedAt = new Date().toISOString();
    metadata.lastAccessedAt = new Date().toISOString();
    metadata.validationChecksum = metadata.checksums.sessionMemory;
    metadata.lastValidatedAt = new Date().toISOString();
    await memoryManager.updateMetadata(sessionId, metadata, 'system');

    eventBus.emit(EventTypes.SESSION_MOUNTED, { sessionId, mountToken: state.mountToken }, 'mount-manager');
    eventBus.emit(EventTypes.RUNTIME_MOUNT_GENERATION_CHANGED, { mountGeneration: state.mountGeneration }, 'mount-manager');
    eventBus.emit(EventTypes.RUNTIME_MOUNT_LEASE_ACQUIRED, { sessionId }, 'mount-manager');
  }

  /**
   * Unmounts the session, transitioning it back to INACTIVE state.
   */
  public async unmount(sessionId: string): Promise<void> {
    try {
      const metadata = await memoryManager.getMetadata(sessionId, 'system');
      if (metadata.lifecycleState === SessionLifecycleState.ACTIVE) {
        metadata.lifecycleState = SessionLifecycleState.INACTIVE;
        await memoryManager.updateMetadata(sessionId, metadata, 'system');
      }
    } catch (err) {
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

  public async getMountedSession(): Promise<string | null> {
    const state = await runtimeStateManager.loadState();
    return state.mountedSessionId || null;
  }

  public async validateMount(sessionId: string): Promise<boolean> {
    const mounted = await this.getMountedSession();
    if (mounted !== sessionId) return false;

    try {
      const metadata = await memoryManager.getMetadata(sessionId, 'system');
      return metadata.lifecycleState === SessionLifecycleState.ACTIVE;
    } catch {
      return false;
    }
  }
}

export const sessionMountManager = SessionMountManager.getInstance();
