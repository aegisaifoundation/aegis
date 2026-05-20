import { Tool } from './index.js';
import { memoryManager } from '../memory/index.js';

export class MemoryTool implements Tool {
  name = 'MemoryTool';
  description = 'Interact with the agent\'s memory. Input should be JSON: {"action": "save", "content": "..."} or {"action": "retrieve"} or {"action": "clear"}.';

  async execute(input: string): Promise<string> {
    try {
      const parsed = JSON.parse(input);
      switch (parsed.action) {
        case 'save':
          await memoryManager.addMemory('system', `SYSTEM MEMORY NOTE: ${parsed.content}`);
          return 'Memory saved.';
        case 'retrieve':
          const mems = memoryManager.getMemories();
          return JSON.stringify(mems.slice(-10)); // return last 10 for context limit safety
        case 'clear':
          await memoryManager.clear();
          return 'Memory cleared.';
        default:
          return `Unknown action: ${parsed.action}`;
      }
    } catch (err: any) {
      return `MemoryTool Error: ${err.message}`;
    }
  }
}
