import fs from 'fs/promises';
import path from 'path';
import type { ToolContext } from '../../../aegis-core/src/types/Tool.js';
import { safeResolve } from '../../../aegis-core/src/utils/pathSandbox.js';

export default async function execute(input: any, context: ToolContext): Promise<string> {
  const target = typeof input === 'string' ? input : (input.path || input.filePath || input.filename);
  if (!target) {
    throw new Error("Missing 'path', 'filePath', or 'filename' parameter for createFile action.");
  }
  if (!context.workspacePath) {
    throw new Error("Workspace path is not defined in ToolContext.");
  }
  
  const targetPath = safeResolve(context.workspacePath, target);
  const content = typeof input === 'string' ? '' : (input.content ?? '');
  
  const dir = path.dirname(targetPath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(targetPath, content, 'utf-8');
  return `File created successfully: ${targetPath}`;
}
