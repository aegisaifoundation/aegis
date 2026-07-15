import { serviceRegistry } from '@aegis/runtime';
export class ConversationConnector {
    id;
    type = 'Conversation';
    connected = false;
    isEnabled = false;
    constructor(id) {
        this.id = id;
    }
    async connect(config) {
        // Must be explicitly enabled in config
        this.isEnabled = config?.enabled === true;
        this.connected = true;
    }
    async disconnect() {
        this.connected = false;
        this.isEnabled = false;
    }
    async collect() {
        if (!this.connected)
            throw new Error('Connector is not connected');
        if (!this.isEnabled) {
            throw new Error('Conversation history integration is disabled by default and has not been explicitly enabled.');
        }
        const conversationContext = serviceRegistry.get('conversationContext');
        if (!conversationContext) {
            return [];
        }
        const messages = await conversationContext.getMessages();
        if (!messages)
            return [];
        return messages.map((msg) => ({
            id: `conv-${msg.id}`,
            content: msg.content,
            metadata: {
                role: msg.role,
                createdAt: msg.createdAt || new Date().toISOString(),
                source: 'conversationContext'
            }
        }));
    }
    async validate() {
        return this.connected && this.isEnabled && serviceRegistry.has('conversationContext');
    }
    async watch(onChange) { }
    async metadata() {
        return {
            connected: this.connected,
            enabled: this.isEnabled
        };
    }
    async statistics() {
        if (!this.isEnabled) {
            return { status: 'Disabled' };
        }
        const samples = await this.collect();
        return {
            messagesCount: samples.length
        };
    }
}
