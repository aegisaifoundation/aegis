export class SessionIsolationManager {
    sessions = new Map();
    getOrCreateSession(sessionId) {
        let session = this.sessions.get(sessionId);
        if (!session) {
            session = {
                sessionId,
                created: new Date(),
                executionCache: new Map(),
                sessionVariables: new Map()
            };
            this.sessions.set(sessionId, session);
            console.log(`[SessionIsolationManager] Initialized secure isolated context workspace for session: ${sessionId}`);
        }
        return session;
    }
    cacheExecutionResult(sessionId, prompt, response) {
        const s = this.getOrCreateSession(sessionId);
        s.executionCache.set(prompt, response);
    }
    getCachedResult(sessionId, prompt) {
        const s = this.sessions.get(sessionId);
        return s?.executionCache.get(prompt);
    }
    clearSession(sessionId) {
        this.sessions.delete(sessionId);
    }
}
//# sourceMappingURL=SessionIsolationManager.js.map