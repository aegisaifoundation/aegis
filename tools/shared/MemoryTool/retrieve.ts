import { memoryManager } from '../../../aegis-core/src/memory/index.js';
import type { ToolContext } from '../../../aegis-core/src/types/Tool.js';

export default async function execute(input: any, context: ToolContext): Promise<string> {
  const mems = memoryManager.getMemories();
  return JSON.stringify(mems.slice(-10)); // return last 10 for context limit safety
}
