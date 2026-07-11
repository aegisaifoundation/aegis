import { SessionLifecycleState } from '@aegis/sdk';
export declare class SessionStateTransitionValidator {
    private static allowedTransitions;
    /**
     * Validates whether a state change from 'from' to 'to' is structurally allowed.
     */
    static validate(from: SessionLifecycleState, to: SessionLifecycleState): boolean;
}
