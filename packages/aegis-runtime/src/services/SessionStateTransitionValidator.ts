import { SessionLifecycleState } from '@aegis/sdk';

export class SessionStateTransitionValidator {
  private static allowedTransitions: Record<SessionLifecycleState, SessionLifecycleState[]> = {
    [SessionLifecycleState.ACTIVE]: [
      SessionLifecycleState.INACTIVE,
      SessionLifecycleState.ARCHIVED,
      SessionLifecycleState.DELETED,
      SessionLifecycleState.LOCKED,
      SessionLifecycleState.CORRUPTED
    ],
    [SessionLifecycleState.INACTIVE]: [
      SessionLifecycleState.ACTIVE,
      SessionLifecycleState.ARCHIVED,
      SessionLifecycleState.DELETED,
      SessionLifecycleState.LOCKED,
      SessionLifecycleState.CORRUPTED
    ],
    [SessionLifecycleState.ARCHIVED]: [
      SessionLifecycleState.RESTORED,
      SessionLifecycleState.DELETED
    ],
    [SessionLifecycleState.RESTORED]: [
      SessionLifecycleState.ACTIVE,
      SessionLifecycleState.INACTIVE,
      SessionLifecycleState.DELETED
    ],
    [SessionLifecycleState.LOCKED]: [
      SessionLifecycleState.ACTIVE,
      SessionLifecycleState.INACTIVE,
      SessionLifecycleState.CORRUPTED
    ],
    [SessionLifecycleState.CORRUPTED]: [
      SessionLifecycleState.RESTORED, // Corruption must go through restore/recovery
      SessionLifecycleState.DELETED
    ],
    [SessionLifecycleState.DELETED]: [
      SessionLifecycleState.RESTORED // Recover soft-deleted sessions
    ]
  };

  /**
   * Validates whether a state change from 'from' to 'to' is structurally allowed.
   */
  public static validate(from: SessionLifecycleState, to: SessionLifecycleState): boolean {
    if (from === to) return true;
    const allowed = this.allowedTransitions[from];
    return allowed ? allowed.includes(to) : false;
  }
}
