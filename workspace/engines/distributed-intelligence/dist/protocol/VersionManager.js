export class VersionManager {
    static isCompatible(clientVersion, serverVersion) {
        if (!clientVersion || !serverVersion)
            return false;
        // Direct comparison
        if (clientVersion === serverVersion)
            return true;
        // Simple Major.Minor.Patch parse
        const client = this.parse(clientVersion);
        const server = this.parse(serverVersion);
        if (!client || !server)
            return false;
        // Major versions must match
        return client.major === server.major;
    }
    static parse(version) {
        const cleaned = version.replace(/^v/, '');
        const parts = cleaned.split('.');
        if (parts.length < 1)
            return null;
        return {
            major: parseInt(parts[0], 10) || 0,
            minor: parseInt(parts[1], 10) || 0,
            patch: parseInt(parts[2], 10) || 0
        };
    }
}
export default VersionManager;
//# sourceMappingURL=VersionManager.js.map