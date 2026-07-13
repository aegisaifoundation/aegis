import { memoryManager } from '@aegis/memory';
import type { ToolContext } from '@aegis/runtime';

export default async function execute(input: any, context: ToolContext): Promise<string> {
  const mems = memoryManager.getMemories();
  return JSON.stringify(mems.slice(-10)); // return last 10 for context limit safety
}
