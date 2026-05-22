export class SkillPermissionManager {
  private allowedPermissions: Set<string> = new Set([
    'provider',
    'tool_access',
    'formatting',
    'workspace'
  ]);

  validate(requiredPermissions: string[] | undefined): boolean {
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }
    return requiredPermissions.every(permission => this.allowedPermissions.has(permission));
  }
}

export const skillPermissionManager = new SkillPermissionManager();
