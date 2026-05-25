import { ToolContext } from '../../../aegis-core/src/types/Tool.js';

export default {
  name: "memory-delete",
  description: "Delete a key from session or profile memory. Action: delete. Input format: { \"key\": \"...\" }",
  version: "1.0.0",
  actions: {
    delete: async (input: { key: string }, context: ToolContext): Promise<string> => {
      const { key } = input;
      if (!key) {
        throw new Error("Missing 'key' parameter for delete action.");
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

        const success = await module.delete(key);

        if (eventBus) {
          eventBus.emit('memory.deleted', { key, success }, 'memory-delete-tool');
        }

        return JSON.stringify({ success });
      } catch (err: any) {
        if (eventBus) {
          eventBus.emit('memory.failed', { action: 'delete', key, error: err.message }, 'memory-delete-tool');
        }
        throw err;
      }
    }
  }
};
