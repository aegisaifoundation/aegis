import { memoryManager } from '../../../aegis-core/src/memory/index.js';
import type { ToolContext } from '../../../aegis-core/src/types/Tool.js';

export default async function execute(input: any, context: ToolContext): Promise<string> {
  await memoryManager.clear();
  return 'Memory cleared.';
}
