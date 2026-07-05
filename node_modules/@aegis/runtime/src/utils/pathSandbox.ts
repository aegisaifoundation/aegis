import path from 'path';

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
