// For type imports, relative paths to aegis-core types are recommended.
// Use type-only import to avoid duplicate value instances at runtime.
import type { ToolContext } from '../../aegis-core/src/types/Tool.js';

export default async function execute(input: any, context: ToolContext): Promise<string> {
  // Extract arguments from input. Note: input can be a parsed JSON object or string.
  const param = typeof input === 'string' ? input : (input.param || input.value);
  
  if (!param) {
    throw new Error("Missing 'param' or 'value' parameter.");
  }

  // Use context.workspacePath for sandbox compliance
  if (context.workspacePath) {
    // Perform operations...
  }

  return `Action executed successfully with param: ${param}`;
}
