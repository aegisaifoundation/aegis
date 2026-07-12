/**
 * MemoryMigrationManager checks and upgrades schemas to match current specifications.
 */
export declare class MemoryMigrationManager {
    private static migrations;
    /**
     * Run schema migrations recursively from current version to target version.
     */
    static migrate(data: any, targetVersion?: string): any;
}
