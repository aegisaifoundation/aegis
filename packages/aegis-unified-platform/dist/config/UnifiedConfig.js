import { serviceRegistry } from '@aegis/runtime';
export class UnifiedConfig {
    static cache = new Map();
    static resolve(engineId, key, sessionId, defaultValue) {
        // 1. Check Session Configuration Overrides
        if (sessionId && serviceRegistry.has('conversationContext')) {
            try {
                const mem = serviceRegistry.get('memoryGateway');
                const sessionState = mem.getSessionState(sessionId);
                if (sessionState && sessionState.config && sessionState.config[key] !== undefined) {
                    return sessionState.config[key];
                }
            }
            catch { }
        }
        // 2. Check Engine configuration
        const cacheKey = `${engineId}.${key}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        // 3. Fallback to Runtime Config
        if (serviceRegistry.has('config')) {
            const configMgr = serviceRegistry.get('config');
            const runtimeConf = configMgr.getRuntimeConfig();
            if (runtimeConf && runtimeConf[engineId] && runtimeConf[engineId][key] !== undefined) {
                return runtimeConf[engineId][key];
            }
            if (runtimeConf && runtimeConf[key] !== undefined) {
                return runtimeConf[key];
            }
        }
        return defaultValue;
    }
    static setEngineConfig(engineId, key, value) {
        this.cache.set(`${engineId}.${key}`, value);
    }
    static clearCache() {
        this.cache.clear();
    }
}
