import fs from 'fs/promises';
import path from 'path';
import type { ToolContext } from '../../../aegis-core/src/types/Tool.js';
import { safeResolve } from '../../../aegis-core/src/utils/pathSandbox.js';

export default async function execute(input: any, context: ToolContext): Promise<string> {
  const target = typeof input === 'string' ? input : (input.path || input.folderPath);
  if (!target) {
    throw new Error("Missing 'path' or 'folderPath' parameter for delete action.");
  }
  if (!context.workspacePath) {
    throw new Error("Workspace path is not defined in ToolContext.");
  }

  const targetPath = safeResolve(context.workspacePath, target);
  
  // Protect the workspace root from deletion
  const normalizedRoot = path.normalize(context.workspacePath);
  if (path.normalize(targetPath) === normalizedRoot) {
    throw new Error("Permission denied: Cannot delete the workspace root directory.");
  }

  // Verify it exists and is a directory
  try {
    const stats = await fs.stat(targetPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path '${target}' is not a directory. Use FileTool to delete files.`);
    }
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return `Folder does not exist: ${targetPath}`;
    }
    throw err;
  }

  await fs.rm(targetPath, { recursive: true, force: true });
  return `Folder successfully deleted: ${targetPath}`;
}
