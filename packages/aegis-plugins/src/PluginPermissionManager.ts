export class PluginPermissionManager {
  private allowedPermissions: Set<string> = new Set([
    'event_bus',
    'configuration',
    'registry',
    'model_provider',
    'workspace',
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

export const pluginPermissionManager = new PluginPermissionManager();
