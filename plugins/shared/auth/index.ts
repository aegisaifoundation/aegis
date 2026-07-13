import type { PluginContext } from '@aegis/plugins';

const sessions = new Map<string, { userId: string; expiresAt: number }>();

export default {
  name: "auth",
  category: "shared",
  description: "Lightweight authentication and session validation helpers",
  version: "1.0.0",

  async initialize(context: PluginContext): Promise<void> {
    const logger = context.services.getLogger();
    logger.info("Auth plugin initialized.");
  },

  async shutdown(context: PluginContext): Promise<void> {
    const logger = context.services.getLogger();
    sessions.clear();
    logger.info("Auth plugin shut down.");
  },

  validateToken(token: string): boolean {
    return typeof token === 'string' && token.startsWith('aegis-token-');
  },

  createSession(userId: string, ttlMs: number = 3600000): { sessionId: string; expiresAt: number } {
    const sessionId = `sess-${Math.random().toString(36).substring(2, 11)}`;
    const expiresAt = Date.now() + ttlMs;
    sessions.set(sessionId, { userId, expiresAt });
    return { sessionId, expiresAt };
  },

  verifySession(sessionId: string): boolean {
    const session = sessions.get(sessionId);
    if (!session) return false;
    if (Date.now() > session.expiresAt) {
      sessions.delete(sessionId);
      return false;
    }
    return true;
  }
};
