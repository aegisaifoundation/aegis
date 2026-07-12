import { safeResolve } from '../utils/pathSandbox.js';

export interface PermissionSchema {
  id: string;
  allowedActions: string[];
}

export class SecurityManager {
  private registries = new Map<string, PermissionSchema>();

  public registerPermissions(id: string, allowedActions: string[]): void {
    this.registries.set(id, { id, allowedActions });
  }

  public verifyPermission(id: string, action: string): boolean {
    const policy = this.registries.get(id);
    if (!policy) return false;
    return policy.allowedActions.includes(action) || policy.allowedActions.includes('*');
  }

  public validatePath(workspaceRoot: string, targetPath: string): string {
    return safeResolve(workspaceRoot, targetPath);
  }
}

export const securityManager = new SecurityManager();
