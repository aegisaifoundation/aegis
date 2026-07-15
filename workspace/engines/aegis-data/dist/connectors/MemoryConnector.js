import { serviceRegistry } from '@aegis/runtime';
export class MemoryConnector {
    id;
    type = 'Memory';
    connected = false;
    sessionIds = ['default'];
    constructor(id) {
        this.id = id;
    }
    async connect(config) {
        if (config?.sessionIds) {
            this.sessionIds = config.sessionIds;
        }
        this.connected = true;
    }
    async disconnect() {
        this.connected = false;
    }
    async collect() {
        if (!this.connected)
            throw new Error('Connector is not connected');
        const memoryManager = serviceRegistry.get('memoryManager');
        if (!memoryManager) {
            // Return empty if memoryManager is not registered (e.g. during standalone tests)
            return [];
        }
        const samples = [];
        for (const sessionId of this.sessionIds) {
            try {
                const history = await memoryManager.getHistory(sessionId, 'system');
                if (history) {
                    for (const msg of history) {
                        // Check if explicitly approved in metadata
                        const approved = msg.metadata?.approved === true || msg.metadata?.allowTraining === true;
                        if (approved) {
                            samples.push({
                                id: `memory-${msg.id}`,
                                content: msg.content,
                                metadata: {
                                    sessionId,
                                    role: msg.role,
                                    timestamp: msg.timestamp,
                                    approved: true
                                }
                            });
                        }
                    }
                }
            }
            catch (err) {
                // Skip session errors
            }
        }
        return samples;
    }
    async validate() {
        return this.connected && serviceRegistry.has('memoryManager');
    }
    async watch(onChange) { }
    async metadata() {
        return {
            sessionIds: this.sessionIds,
            connected: this.connected
        };
    }
    async statistics() {
        const samples = await this.collect();
        return {
            approvedMemoriesCount: samples.length
        };
    }
}
