import fs from 'fs/promises';
import type { ToolContext } from '../../../aegis-core/src/types/Tool.js';
import { safeResolve } from '../../../aegis-core/src/utils/pathSandbox.js';

export default async function execute(input: any, context: ToolContext): Promise<string> {
  const filePath = typeof input === 'string' ? input : (input.path || input.filePath || input.filename);
  if (!filePath) {
    throw new Error("Missing 'path', 'filePath', or 'filename' parameter for read action.");
  }
  if (!context.workspacePath) {
    throw new Error("Workspace path is not defined in ToolContext.");
  }
  
  const targetPath = safeResolve(context.workspacePath, filePath);
  return await fs.readFile(targetPath, 'utf-8');
}
