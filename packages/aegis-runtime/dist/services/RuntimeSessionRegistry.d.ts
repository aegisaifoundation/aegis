import { SessionMetadata } from '@aegis/sdk';
export declare class RuntimeSessionRegistry {
    private static instance;
    static getInstance(): RuntimeSessionRegistry;
    /**
     * Retrieves the indexed summary of sessions.
     */
    listSessions(): Promise<any[]>;
    /**
     * Delegates session registration directly to the getMemoryIndexManager().
     */
    registerSession(metadata: SessionMetadata): Promise<void>;
    /**
     * Delegates session unregistration directly to the getMemoryIndexManager().
     */
    unregisterSession(sessionId: string): Promise<void>;
}
export declare const runtimeSessionRegistry: RuntimeSessionRegistry;
