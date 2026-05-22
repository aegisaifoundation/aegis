export class CommandPermissionManager {
    allowedPermissions = new Set([
        'runtime.commands',
        'runtime.registry',
        'filesystem',
        'network'
    ]);
    validate(requiredPermissions) {
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }
        return requiredPermissions.every(permission => this.allowedPermissions.has(permission));
    }
}
export const commandPermissionManager = new CommandPermissionManager();
