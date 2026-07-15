export interface SessionState {
  readonly sessionId: string;
  readonly created: Date;
  readonly executionCache: Map<string, string>;
  readonly sessionVariables: Map<string, any>;
}

export class SessionIsolationManager {
  private sessions = new Map<string, SessionState>();

  getOrCreateSession(sessionId: string): SessionState {
    let session = this.sessions.get(sessionId);
    if (!session) {
      session = {
        sessionId,
        created: new Date(),
        executionCache: new Map<string, string>(),
        sessionVariables: new Map<string, any>()
      };
      this.sessions.set(sessionId, session);
      console.log(`[SessionIsolationManager] Initialized secure isolated context workspace for session: ${sessionId}`);
    }
    return session;
  }

  cacheExecutionResult(sessionId: string, prompt: string, response: string): void {
    const s = this.getOrCreateSession(sessionId);
    s.executionCache.set(prompt, response);
  }

  getCachedResult(sessionId: string, prompt: string): string | undefined {
    const s = this.sessions.get(sessionId);
    return s?.executionCache.get(prompt);
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}
