import fs from 'fs/promises';
import path from 'path';
import type { ToolContext } from '@aegis/runtime';
import { safeResolve } from '@aegis/runtime';

export default async function execute(input: any, context: ToolContext): Promise<string> {
  const filePath = typeof input === 'string' ? '' : (input.path || input.filePath || input.filename);
  const content = typeof input === 'string' ? '' : (input.content ?? '');
  if (!filePath) {
    throw new Error("Missing 'path', 'filePath', or 'filename' parameter for write action.");
  }
  if (!context.workspacePath) {
    throw new Error("Workspace path is not defined in ToolContext.");
  }
  
  const targetPath = safeResolve(context.workspacePath, filePath);
  // Ensure parent directory exists
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, content, 'utf-8');
  return `Successfully wrote to ${targetPath}`;
}
