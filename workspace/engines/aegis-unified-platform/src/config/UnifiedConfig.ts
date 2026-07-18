import { serviceRegistry } from '@aegis/runtime';

export class UnifiedConfig {
  private static cache = new Map<string, any>();

  static resolve<T = any>(
    engineId: string,
    key: string,
    sessionId?: string,
    defaultValue?: T
  ): T {
    // 1. Check Session Configuration Overrides
    if (sessionId && serviceRegistry.has('conversationContext')) {
      try {
        const mem = serviceRegistry.get<any>('memoryGateway');
        const sessionState = mem.getSessionState(sessionId);
        if (sessionState && sessionState.config && sessionState.config[key] !== undefined) {
          return sessionState.config[key];
        }
      } catch {}
    }

    // 2. Check Engine configuration
    const cacheKey = `${engineId}.${key}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // 3. Fallback to Runtime Config
    if (serviceRegistry.has('config')) {
      const configMgr = serviceRegistry.get<any>('config');
      const runtimeConf = configMgr.getRuntimeConfig();
      if (runtimeConf && runtimeConf[engineId] && runtimeConf[engineId][key] !== undefined) {
        return runtimeConf[engineId][key];
      }
      if (runtimeConf && runtimeConf[key] !== undefined) {
        return runtimeConf[key];
      }
    }

    return defaultValue as T;
  }

  static setEngineConfig(engineId: string, key: string, value: any): void {
    this.cache.set(`${engineId}.${key}`, value);
  }

  static clearCache() {
    this.cache.clear();
  }
}
