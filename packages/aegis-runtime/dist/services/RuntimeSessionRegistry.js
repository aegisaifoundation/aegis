import { serviceRegistry } from '../registry/ServiceRegistry.js';
const getMemoryIndexManager = () => serviceRegistry.get('MemoryIndexManager');
export class RuntimeSessionRegistry {
    static instance = new RuntimeSessionRegistry();
    static getInstance() {
        return this.instance;
    }
    /**
     * Retrieves the indexed summary of sessions.
     */
    async listSessions() {
        return await getMemoryIndexManager().listSessions();
    }
    /**
     * Delegates session registration directly to the getMemoryIndexManager().
     */
    async registerSession(metadata) {
        await getMemoryIndexManager().registerSession(metadata);
    }
    /**
     * Delegates session unregistration directly to the getMemoryIndexManager().
     */
    async unregisterSession(sessionId) {
        await getMemoryIndexManager().unregisterSession(sessionId);
    }
}
export const runtimeSessionRegistry = RuntimeSessionRegistry.getInstance();
