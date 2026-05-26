import { SourceAttribution } from '../interfaces/MemoryTypes.js';

export interface MemoryPermissionsConfig {
  read: string[];
  write: string[];
  refine: string[];
  delete: string[];
}

export class MemoryPermissions {
  private static defaultPermissions: MemoryPermissionsConfig = {
    read: ['*'], // Allow all actors to read by default
    write: ['user', 'agent', 'workflow', 'system', 'plugin'],
    refine: ['system', 'agent'],
    delete: ['system', 'user']
  };

  /**
   * Validates whether a given actor (or actor type) is authorized to perform the action.
   */
  public static check(
    action: 'read' | 'write' | 'refine' | 'delete',
    actor: string | SourceAttribution | undefined,
    customConfig?: Partial<MemoryPermissionsConfig>
  ): boolean {
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
