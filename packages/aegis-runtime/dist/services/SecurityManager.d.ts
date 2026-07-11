export interface PermissionSchema {
    id: string;
    allowedActions: string[];
}
export declare class SecurityManager {
    private registries;
    registerPermissions(id: string, allowedActions: string[]): void;
    verifyPermission(id: string, action: string): boolean;
    validatePath(workspaceRoot: string, targetPath: string): string;
}
export declare const securityManager: SecurityManager;
