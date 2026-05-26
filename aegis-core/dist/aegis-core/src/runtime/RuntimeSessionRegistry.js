import { MemoryIndexManager } from '../memory/indexing/MemoryIndexManager.js';
export class RuntimeSessionRegistry {
    static instance = new RuntimeSessionRegistry();
    static getInstance() {
        return this.instance;
    }
    /**
     * Retrieves the indexed summary of sessions.
     */
    async listSessions() {
        return await MemoryIndexManager.listSessions();
    }
    /**
     * Delegates session registration directly to the MemoryIndexManager.
     */
    async registerSession(metadata) {
        await MemoryIndexManager.registerSession(metadata);
    }
    /**
     * Delegates session unregistration directly to the MemoryIndexManager.
     */
    async unregisterSession(sessionId) {
        await MemoryIndexManager.unregisterSession(sessionId);
    }
}
export const runtimeSessionRegistry = RuntimeSessionRegistry.getInstance();
