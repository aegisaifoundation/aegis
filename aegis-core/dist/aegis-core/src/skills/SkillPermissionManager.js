export class SkillPermissionManager {
    allowedPermissions = new Set([
        'provider',
        'tool_access',
        'formatting',
        'workspace'
    ]);
    validate(requiredPermissions) {
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }
        return requiredPermissions.every(permission => this.allowedPermissions.has(permission));
    }
}
export const skillPermissionManager = new SkillPermissionManager();
