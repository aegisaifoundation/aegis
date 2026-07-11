export declare class CommandPermissionManager {
    private allowedPermissions;
    validate(requiredPermissions: string[] | undefined): boolean;
}
export declare const commandPermissionManager: CommandPermissionManager;
