import fs from 'fs/promises';
import type { ToolContext } from '@aegis/runtime';
import { safeResolve } from '@aegis/runtime';

export default async function execute(input: any, context: ToolContext): Promise<string> {
  const target = typeof input === 'string' ? input : (input.path || input.folderPath || '');
  if (!context.workspacePath) {
    throw new Error("Workspace path is not defined in ToolContext.");
  }

  const targetPath = safeResolve(context.workspacePath, target);
  
  // Verify it exists and is a directory
  try {
    const stats = await fs.stat(targetPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path '${target}' is not a directory.`);
    }
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      throw new Error(`Directory does not exist: ${targetPath}`);
    }
    throw err;
  }

  const entries = await fs.readdir(targetPath, { withFileTypes: true });
  const result = entries.map(entry => ({
    name: entry.name,
    type: entry.isDirectory() ? 'folder' : 'file'
  }));

  return JSON.stringify(result, null, 2);
}
