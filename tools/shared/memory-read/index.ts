import { ToolContext } from '../../../aegis-core/src/types/Tool.js';

export default {
  name: "memory-read",
  description: "Read a key from session or profile memory. Action: read. Input format: { \"key\": \"...\" }",
  version: "1.0.0",
  actions: {
    read: async (input: { key: string }, context: ToolContext): Promise<string> => {
      const { key } = input;
      if (!key) {
        throw new Error("Missing 'key' parameter for read action.");
      }

      const registry = context.memoryRegistry;
      const eventBus = context.eventBus;

      if (!registry) {
        throw new Error("Memory registry not available in context");
      }

      try {
        let moduleName = 'session';
        // Map user.* or profile.* or preference.* to profile memory
        if (key.startsWith('user.') || key.startsWith('profile.') || key.startsWith('preference.')) {
          moduleName = 'profile';
        }

        const module = registry.get(moduleName);
        if (!module) {
          throw new Error(`Memory module '${moduleName}' not registered`);
        }

        const value = await module.read(key);

        if (eventBus) {
          eventBus.emit('memory.read', { key, value }, 'memory-read-tool');
        }

        return JSON.stringify({ value });
      } catch (err: any) {
        if (eventBus) {
          eventBus.emit('memory.failed', { action: 'read', key, error: err.message }, 'memory-read-tool');
        }
        throw err;
      }
    }
  }
};
