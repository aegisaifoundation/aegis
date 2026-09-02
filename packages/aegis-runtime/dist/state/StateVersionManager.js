export class StateVersionManager {
    static compareRecordVersions(localRecord, remoteMutation) {
        const localVer = localRecord.versionInfo.version;
        const localNode = localRecord.versionInfo.originNodeId || localRecord.updatedByNodeId;
        const localTime = localRecord.updatedAt;
        const remoteVer = remoteMutation.expectedVersion !== undefined ? remoteMutation.expectedVersion + 1 : 1;
        const remoteNode = remoteMutation.originNodeId;
        const remoteTime = remoteMutation.timestamp;
        // Check value equality
        if (localVer === remoteVer &&
            localNode === remoteNode &&
            JSON.stringify(localRecord.value) === JSON.stringify(remoteMutation.value)) {
            return 'IDENTICAL';
        }
        // 1. Version Comparison
        if (remoteVer > localVer)
            return 'NEWER';
        if (remoteVer < localVer)
            return 'OLDER';
        // 2. Same Version, Different Node/Mutation -> CONFLICT
        if (localNode !== remoteNode)
            return 'CONFLICT';
        // 3. Same Version & Node -> Compare Timestamp
        if (remoteTime > localTime)
            return 'NEWER';
        if (remoteTime < localTime)
            return 'OLDER';
        return 'CONFLICT';
    }
    // Deterministic 4-step Last Write Wins tie-breaker
    static evaluateLwwWinner(recordA, recordB) {
        // Step 1: Higher Version
        if (recordA.version !== recordB.version) {
            return recordA.version > recordB.version ? 'A' : 'B';
        }
        // Step 2: Newer Timestamp
        if (recordA.timestamp !== recordB.timestamp) {
            return recordA.timestamp > recordB.timestamp ? 'A' : 'B';
        }
        // Step 3: Origin Node ID tie-break (alphabetical)
        if (recordA.nodeId !== recordB.nodeId) {
            return recordA.nodeId > recordB.nodeId ? 'A' : 'B';
        }
        // Step 4: Mutation ID tie-break (alphabetical)
        return recordA.mutationId >= recordB.mutationId ? 'A' : 'B';
    }
}
