import { memoryManager } from '@aegis/memory';
import type { ToolContext } from '@aegis/runtime';

export default async function execute(input: any, context: ToolContext): Promise<string> {
  const content = typeof input === 'string' ? input : (input.content || '');
  if (!content) {
    throw new Error("Missing 'content' parameter for save action.");
  }
  await memoryManager.addMemory('system', `SYSTEM MEMORY NOTE: ${content}`);
  return 'Memory saved.';
}
