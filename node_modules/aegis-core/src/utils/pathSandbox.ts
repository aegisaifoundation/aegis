import path from 'path';

/**
 * Safely resolves a path relative to the workspace root and ensures it does not escape.
 * Throws a "Permission denied" error if the path escapes the sandbox root.
 * 
 * @param workspaceRoot The absolute path of the sandboxed workspace.
 * @param targetPath The input path (relative or absolute) to resolve.
 * @returns The normalized absolute target path.
 */
export function safeResolve(workspaceRoot: string, targetPath: string): string {
  if (!workspaceRoot) {
    throw new Error('Permission denied: Workspace root is undefined.');
  }

  const normalizedWorkspace = path.normalize(workspaceRoot);
  const resolvedTarget = path.resolve(normalizedWorkspace, targetPath);
  
  const relative = path.relative(normalizedWorkspace, resolvedTarget);

  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Permission denied: Path '${targetPath}' resolves outside of the workspace sandbox.`);
  }

  return resolvedTarget;
}
