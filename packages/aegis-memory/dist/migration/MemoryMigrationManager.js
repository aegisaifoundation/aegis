/**
 * MemoryMigrationManager checks and upgrades schemas to match current specifications.
 */
export class MemoryMigrationManager {
    static migrations = new Map();
    static {
        // Register standard migrations
        MemoryMigrationManager.migrations.set('1.0.0', (data) => {
            if (!data.memoryVersion) {
                data.memoryVersion = '1.0.0';
            }
            if (!data.checksums) {
                data.checksums = {};
            }
            if (!data.quotas) {
                data.quotas = {
                    maxSessions: 100,
                    maxHistorySize: 10 * 1024 * 1024, // 10MB
                    maxWorkingMemorySize: 1500,
                    maxSessionMemorySize: 1000,
                    maxSnapshots: 10
                };
            }
            return data;
        });
    }
    /**
     * Run schema migrations recursively from current version to target version.
     */
    static migrate(data, targetVersion = '1.0.0') {
        const currentVersion = data.memoryVersion || '0.0.1';
        if (currentVersion === targetVersion) {
            return data;
        }
        console.log(`[MemoryMigrationManager] Upgrading schema: ${currentVersion} -> ${targetVersion}`);
        // Process step migrations or call direct target handler
        const handler = this.migrations.get(targetVersion);
        if (handler) {
            return handler(data);
        }
        data.memoryVersion = targetVersion;
        return data;
    }
}
