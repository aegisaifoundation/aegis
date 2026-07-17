export class CollaborationSessionManager {
    sessionSandboxes = new Map(); // sessionId -> Set of NodeIds
    resourceAllocations = new Map(); // sessionId:nodeId -> allocation
    createSandbox(sessionId, initialNodeIds) {
        this.sessionSandboxes.set(sessionId, new Set(initialNodeIds));
        console.log(`[CollaborationSessionManager] Sandboxed workspace created for session ${sessionId}`);
    }
    isAuthorized(sessionId, nodeId) {
        const sandbox = this.sessionSandboxes.get(sessionId);
        return sandbox ? sandbox.has(nodeId) : false;
    }
    addToSandbox(sessionId, nodeId) {
        const sandbox = this.sessionSandboxes.get(sessionId);
        if (sandbox) {
            sandbox.add(nodeId);
            console.log(`[CollaborationSessionManager] Added ${nodeId} to sandbox of session ${sessionId}`);
        }
    }
    async negotiateResource(sessionId, nodeId, required) {
        const key = `${sessionId}:${nodeId}`;
        // Simulate policy checks and resource availability negotiation
        const approved = (required.gpuTimeMs ?? 0) < 50000 && (required.memory ?? 0) < 8192;
        const allocation = {
            sessionId,
            nodeId,
            cpu: required.cpu ?? 1,
            memory: required.memory ?? 1024,
            storage: required.storage ?? 1000,
            gpuTimeMs: required.gpuTimeMs ?? 0,
            approved
        };
        this.resourceAllocations.set(key, allocation);
        console.log(`[CollaborationSessionManager] Resource negotiation for ${nodeId} in ${sessionId}: ${approved ? 'APPROVED' : 'DENIED'}`);
        return allocation;
    }
    getAllocation(sessionId, nodeId) {
        return this.resourceAllocations.get(`${sessionId}:${nodeId}`);
    }
    closeSandbox(sessionId) {
        this.sessionSandboxes.delete(sessionId);
        for (const key of this.resourceAllocations.keys()) {
            if (key.startsWith(`${sessionId}:`)) {
                this.resourceAllocations.delete(key);
            }
        }
        console.log(`[CollaborationSessionManager] Destroyed sandbox and allocations for session ${sessionId}`);
    }
}
