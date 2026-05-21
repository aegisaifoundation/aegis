import fs from 'fs/promises';
import type { ToolContext } from '../../../aegis-core/src/types/Tool.js';
import { safeResolve } from '../../../aegis-core/src/utils/pathSandbox.js';

export default async function execute(input: any, context: ToolContext): Promise<string> {
  const target = typeof input === 'string' ? input : (input.path || input.folderPath || input.filePath);
  if (!target) {
    throw new Error("Missing 'path' or 'folderPath' parameter for create action.");
  }
  if (!context.workspacePath) {
    throw new Error("Workspace path is not defined in ToolContext.");
  }

  const targetPath = safeResolve(context.workspacePath, target);
  await fs.mkdir(targetPath, { recursive: true });
  return `Folder created successfully: ${targetPath}`;
}
