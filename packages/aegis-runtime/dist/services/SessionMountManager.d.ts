export declare class SessionMountManager {
    private static instance;
    static getInstance(): SessionMountManager;
    /**
     * Mounts a session as the single active cognitive context.
     * Runs transition, compatibility, and invariant validations before committing.
     */
    mount(sessionId: string): Promise<void>;
    /**
     * Unmounts the session, transitioning it back to INACTIVE state.
     */
    unmount(sessionId: string): Promise<void>;
    getMountedSession(): Promise<string | null>;
    validateMount(sessionId: string): Promise<boolean>;
}
export declare const sessionMountManager: SessionMountManager;
