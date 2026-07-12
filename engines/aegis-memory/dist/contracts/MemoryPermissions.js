export class MemoryPermissions {
    static defaultPermissions = {
        read: ['*'], // Allow all actors to read by default
        write: ['user', 'agent', 'workflow', 'system', 'plugin'],
        refine: ['system', 'agent'],
        delete: ['system', 'user']
    };
    /**
     * Validates whether a given actor (or actor type) is authorized to perform the action.
     */
    static check(action, actor, customConfig) {
        if (!actor) {
            // By default, system is allowed if actor is omitted, but let's require actor attribution
            return false;
        }
        const config = { ...this.defaultPermissions, ...customConfig };
        const allowed = config[action];
        if (allowed.includes('*')) {
            return true;
        }
        const actorType = typeof actor === 'string' ? actor : actor.type;
        return allowed.includes(actorType);
    }
}
