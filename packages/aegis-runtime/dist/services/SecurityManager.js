import { safeResolve } from '../utils/pathSandbox.js';
export class SecurityManager {
    registries = new Map();
    registerPermissions(id, allowedActions) {
        this.registries.set(id, { id, allowedActions });
    }
    verifyPermission(id, action) {
        const policy = this.registries.get(id);
        if (!policy)
            return false;
        return policy.allowedActions.includes(action) || policy.allowedActions.includes('*');
    }
    validatePath(workspaceRoot, targetPath) {
        return safeResolve(workspaceRoot, targetPath);
    }
}
export const securityManager = new SecurityManager();
