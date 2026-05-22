import { PluginContext } from '../../../aegis-core/src/plugins/PluginContext.js';

interface CacheEntry {
  value: any;
  expiresAt: number | null;
}

const store = new Map<string, CacheEntry>();
let cleanInterval: NodeJS.Timeout | null = null;

export default {
  name: "cache",
  category: "shared",
  description: "In-memory key-value cache layer with TTL support",
  version: "1.0.0",

  async initialize(context: PluginContext): Promise<void> {
    const logger = context.services.getLogger();
    logger.info("Cache plugin initialized.");

    cleanInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of store.entries()) {
        if (entry.expiresAt && now > entry.expiresAt) {
          store.delete(key);
        }
      }
    }, 60000);
  },

  async shutdown(context: PluginContext): Promise<void> {
    const logger = context.services.getLogger();
    logger.info("Cache plugin shut down.");
    if (cleanInterval) {
      clearInterval(cleanInterval);
      cleanInterval = null;
    }
    store.clear();
  },

  set(key: string, value: any, ttlMs?: number): void {
    const expiresAt = ttlMs ? Date.now() + ttlMs : null;
    store.set(key, { value, expiresAt });
  },

  get(key: string): any | null {
    const entry = store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry.value;
  },

  delete(key: string): boolean {
    return store.delete(key);
  },

  clear(): void {
    store.clear();
  }
};
