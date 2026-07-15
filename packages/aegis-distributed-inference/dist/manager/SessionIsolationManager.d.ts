export interface SessionState {
    readonly sessionId: string;
    readonly created: Date;
    readonly executionCache: Map<string, string>;
    readonly sessionVariables: Map<string, any>;
}
export declare class SessionIsolationManager {
    private sessions;
    getOrCreateSession(sessionId: string): SessionState;
    cacheExecutionResult(sessionId: string, prompt: string, response: string): void;
    getCachedResult(sessionId: string, prompt: string): string | undefined;
    clearSession(sessionId: string): void;
}
