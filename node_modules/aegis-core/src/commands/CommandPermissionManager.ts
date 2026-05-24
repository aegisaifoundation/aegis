export class CommandPermissionManager {
  private allowedPermissions: Set<string> = new Set([
    'runtime.commands',
    'runtime.registry',
    'filesystem',
    'network'
  ]);

  validate(requiredPermissions: string[] | undefined): boolean {
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }
    return requiredPermissions.every(permission => this.allowedPermissions.has(permission));
  }
}

export const commandPermissionManager = new CommandPermissionManager();
