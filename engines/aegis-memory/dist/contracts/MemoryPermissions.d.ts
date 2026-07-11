import { SourceAttribution } from '../interfaces/MemoryTypes.js';
export interface MemoryPermissionsConfig {
    read: string[];
    write: string[];
    refine: string[];
    delete: string[];
}
export declare class MemoryPermissions {
    private static defaultPermissions;
    /**
     * Validates whether a given actor (or actor type) is authorized to perform the action.
     */
    static check(action: 'read' | 'write' | 'refine' | 'delete', actor: string | SourceAttribution | undefined, customConfig?: Partial<MemoryPermissionsConfig>): boolean;
}
