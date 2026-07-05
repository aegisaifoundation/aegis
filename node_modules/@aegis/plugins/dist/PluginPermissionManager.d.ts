export declare class PluginPermissionManager {
    private allowedPermissions;
    validate(requiredPermissions: string[] | undefined): boolean;
}
export declare const pluginPermissionManager: PluginPermissionManager;
