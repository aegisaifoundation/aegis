import { ToolContext } from '../../../aegis-core/src/types/Tool.js';

export default {
  name: "memory-write",
  description: "Write or update a key in session or profile memory. Action: write. Input format: { \"key\": \"...\", \"value\": \"...\" }",
  version: "1.0.0",
  actions: {
    write: async (input: { key: string, value: any }, context: ToolContext): Promise<string> => {
      const { key, value } = input;
      if (!key) {
        throw new Error("Missing 'key' parameter for write action.");
      }
      if (value === undefined) {
        throw new Error("Missing 'value' parameter for write action.");
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

        await module.write(key, value);

        if (eventBus) {
          eventBus.emit('memory.updated', { key, value }, 'memory-write-tool');
        }

        return JSON.stringify({ success: true });
      } catch (err: any) {
        if (eventBus) {
          eventBus.emit('memory.failed', { action: 'write', key, error: err.message }, 'memory-write-tool');
        }
        throw err;
      }
    }
  }
};
