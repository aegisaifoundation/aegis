export class ContextManager {
    sessionContexts = new Map();
    addMessage(sessionId, role, content) {
        let history = this.sessionContexts.get(sessionId);
        if (!history) {
            history = [];
            this.sessionContexts.set(sessionId, history);
        }
        history.push({ role, content, timestamp: new Date() });
        // Auto compression / sliding window if history exceeds threshold
        if (history.length > 50) {
            this.compressContext(sessionId);
        }
    }
    getMessages(sessionId) {
        return this.sessionContexts.get(sessionId) ?? [];
    }
    clearContext(sessionId) {
        this.sessionContexts.delete(sessionId);
    }
    compressContext(sessionId) {
        const history = this.sessionContexts.get(sessionId);
        if (!history || history.length <= 10)
            return;
        // Sliding window: keep system prompt, and last 10 messages
        const systemPrompts = history.filter(m => m.role === 'system');
        const tail = history.slice(-10);
        this.sessionContexts.set(sessionId, [...systemPrompts, ...tail]);
        console.log(`[ContextManager] Compressed session ${sessionId} context window (new count: ${this.getMessages(sessionId).length}).`);
    }
    getContextSizeTokens(sessionId) {
        const history = this.getMessages(sessionId);
        // Simple mock token counter: 1 word ~ 1.3 tokens
        return history.reduce((acc, msg) => acc + Math.ceil(msg.content.split(/\s+/).length * 1.3), 0);
    }
}
//# sourceMappingURL=ContextManager.js.map