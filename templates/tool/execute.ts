// Import types from the correct AEGIS packages — NOT from relative aegis-core paths.
// Use 'import type' to avoid duplicate value instances at runtime.
import type { ToolContext } from '@aegis/runtime';

/**
 * Execute a custom action for this tool.
 *
 * @param input  - The parsed arguments object from the LLM.
 *                 Access properties like: input.param, input.value, input.path, etc.
 * @param context - Runtime context providing workspace paths and sandboxed utilities.
 *                  context.workspacePath — the agent's sandboxed workspace directory.
 */
export default async function execute(input: any, context: ToolContext): Promise<string> {
  // Extract arguments from input
  const param = typeof input === 'string' ? input : (input.param || input.value || '');

  if (!param) {
    throw new Error("Missing 'param' or 'value' parameter.");
  }

  // Use context.workspacePath for any file system operations (stays sandboxed)
  // const { safeResolve } = await import('@aegis/runtime');
  // const targetPath = safeResolve(context.workspacePath, param);

  return `Action executed successfully with param: ${param}`;
}
