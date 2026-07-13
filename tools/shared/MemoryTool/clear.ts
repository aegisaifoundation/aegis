import { memoryManager } from '@aegis/memory';
import type { ToolContext } from '@aegis/runtime';

export default async function execute(input: any, context: ToolContext): Promise<string> {
  await memoryManager.clear();
  return 'Memory cleared.';
}
